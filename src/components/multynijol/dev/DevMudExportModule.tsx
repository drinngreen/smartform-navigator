import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { FileSpreadsheet, Loader2, Filter, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL_TENANT_ID = "819c783e-78dd-4080-8265-802e75b0d813";

interface AggRow {
  cer: string;
  descrizione: string;
  carico_scarico: string;
  produttore: string;
  destinatario: string;
  trasportatore: string;
  totale_kg: number;
  numero_movimenti: number;
}

export function DevMudExportModule({ tenantId = MULTY_TENANT_ID, tenantLabel = "Multyproget" }: { tenantId?: string; tenantLabel?: string }) {
  const currentYear = new Date().getFullYear();
  const [anno, setAnno] = useState<number>(currentYear);

  const { data: registro, isLoading: loadingRegistro } = useQuery({
    queryKey: ["mud-registro", tenantId, anno],
    queryFn: async () => {
      const start = `${anno}-01-01`;
      const end = `${anno}-12-31`;
      const { data, error } = await supabase
        .from("registro_generale" as any)
        .select("cer, descrizione, carico_scarico, quantita, peso_destino, luogo_produzione, destinazione, raw, data_movimento")
        .eq("tenant_id", tenantId)
        .gte("data_movimento", start)
        .lte("data_movimento", end)
        .order("data_movimento", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: movimenti, isLoading: loadingMov } = useQuery({
    queryKey: ["mud-movimenti", tenantId, anno],
    queryFn: async () => {
      const start = `${anno}-01-01`;
      const end = `${anno}-12-31`;
      const { data, error } = await supabase
        .from("movimenti_impianto" as any)
        .select("cer, descrizione_rifiuto, tipo_movimento, quantita_kg, produttore_denominazione, produttore_cf_piva, destinatario_denominazione, destinatario_cf_piva, trasportatore_denominazione, trasportatore_cf_piva, data_movimento")
        .eq("tenant_id", tenantId)
        .gte("data_movimento", start)
        .lte("data_movimento", end);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const loading = loadingRegistro || loadingMov;

  const aggregated: AggRow[] = useMemo(() => {
    const bucket = new Map<string, AggRow>();
    for (const m of movimenti || []) {
      const cer = (m.cer || "").toString().trim();
      const tipo = (m.tipo_movimento || "").toString().toUpperCase();
      const produttore = m.produttore_cf_piva ? `${m.produttore_denominazione || ""} [${m.produttore_cf_piva}]` : (m.produttore_denominazione || "—");
      const destinatario = m.destinatario_cf_piva ? `${m.destinatario_denominazione || ""} [${m.destinatario_cf_piva}]` : (m.destinatario_denominazione || "—");
      const trasportatore = m.trasportatore_cf_piva ? `${m.trasportatore_denominazione || ""} [${m.trasportatore_cf_piva}]` : (m.trasportatore_denominazione || "—");
      const key = `${cer}|${tipo}|${produttore}|${destinatario}|${trasportatore}`;
      const cur = bucket.get(key) || {
        cer, descrizione: m.descrizione_rifiuto || "",
        carico_scarico: tipo,
        produttore, destinatario, trasportatore,
        totale_kg: 0, numero_movimenti: 0,
      };
      cur.totale_kg += Number(m.quantita_kg) || 0;
      cur.numero_movimenti += 1;
      bucket.set(key, cur);
    }
    return Array.from(bucket.values()).sort((a, b) => a.cer.localeCompare(b.cer) || a.carico_scarico.localeCompare(b.carico_scarico));
  }, [movimenti]);

  const totali = useMemo(() => {
    const carichi = aggregated.filter(a => a.carico_scarico === "CARICO").reduce((s, a) => s + a.totale_kg, 0);
    const scarichi = aggregated.filter(a => a.carico_scarico === "SCARICO").reduce((s, a) => s + a.totale_kg, 0);
    const cers = new Set(aggregated.map(a => a.cer)).size;
    return { carichi, scarichi, cers, righe: aggregated.length };
  }, [aggregated]);

  const perCER = useMemo(() => {
    const bucket = new Map<string, { cer: string; descrizione: string; carichi: number; scarichi: number }>();
    for (const a of aggregated) {
      const cur = bucket.get(a.cer) || { cer: a.cer, descrizione: a.descrizione, carichi: 0, scarichi: 0 };
      if (a.carico_scarico === "CARICO") cur.carichi += a.totale_kg;
      else if (a.carico_scarico === "SCARICO") cur.scarichi += a.totale_kg;
      if (!cur.descrizione && a.descrizione) cur.descrizione = a.descrizione;
      bucket.set(a.cer, cur);
    }
    return Array.from(bucket.values()).sort((a, b) => a.cer.localeCompare(b.cer));
  }, [aggregated]);

  const exportXlsx = () => {
    if (!aggregated.length) return toast.error("Nessun movimento nell'anno selezionato");
    const wb = XLSX.utils.book_new();

    // Sheet 1 — Riepilogo per CER
    const wsCer = XLSX.utils.json_to_sheet(perCER.map(r => ({
      "Codice CER": r.cer,
      "Descrizione": r.descrizione,
      "Totale Carichi (kg)": Math.round(r.carichi),
      "Totale Scarichi (kg)": Math.round(r.scarichi),
      "Giacenza netta (kg)": Math.round(r.carichi - r.scarichi),
    })));
    XLSX.utils.book_append_sheet(wb, wsCer, "Riepilogo CER");

    // Sheet 2 — Aggregato dettagliato per produttore/destinatario/trasportatore
    const wsAgg = XLSX.utils.json_to_sheet(aggregated.map(r => ({
      "Codice CER": r.cer,
      "Descrizione rifiuto": r.descrizione,
      "Tipo": r.carico_scarico,
      "Produttore [CF/P.IVA]": r.produttore,
      "Destinatario [CF/P.IVA]": r.destinatario,
      "Trasportatore [CF/P.IVA]": r.trasportatore,
      "Totale kg": Math.round(r.totale_kg),
      "N. movimenti": r.numero_movimenti,
    })));
    XLSX.utils.book_append_sheet(wb, wsAgg, "Aggregato Soggetti");

    // Sheet 3 — Registro completo (dump)
    const wsReg = XLSX.utils.json_to_sheet((registro || []).map(r => ({
      "Data": r.data_movimento,
      "Tipo": r.carico_scarico,
      "CER": r.cer,
      "Descrizione": r.descrizione,
      "Quantità (kg)": Number(r.quantita) || 0,
      "Peso a destino (kg)": Number(r.peso_destino) || 0,
      "Luogo produzione": r.luogo_produzione,
      "Destinazione": r.destinazione,
    })));
    XLSX.utils.book_append_sheet(wb, wsReg, "Registro Completo");

    // Sheet 4 — Totali di sintesi
    const wsTot = XLSX.utils.aoa_to_sheet([
      ["Dichiarazione MUD", `Anno ${anno} — ${tenantLabel}`],
      [],
      ["Totale kg CARICATI", Math.round(totali.carichi)],
      ["Totale kg SCARICATI", Math.round(totali.scarichi)],
      ["Giacenza netta (kg)", Math.round(totali.carichi - totali.scarichi)],
      ["Numero CER movimentati", totali.cers],
      ["Numero righe aggregate", totali.righe],
      [],
      ["Generato il", new Date().toLocaleString("it-IT")],
    ]);
    XLSX.utils.book_append_sheet(wb, wsTot, "Totali");

    XLSX.writeFile(wb, `MUD_${tenantLabel}_${anno}.xlsx`);
    toast.success(`Export MUD ${anno} generato`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/30 bg-card/60 p-4 flex flex-wrap items-center gap-3">
        <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-lg font-semibold">Esportazione Dati MUD</h2>
          <p className="text-xs text-muted-foreground">Aggregazione annuale carichi/scarichi per CER e soggetti (produttore, destinatario, trasportatore).</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select value={anno} onChange={e => setAnno(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm">
            {Array.from({ length: 6 }).map((_, i) => {
              const y = currentYear - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
        <button onClick={exportXlsx} disabled={loading || !aggregated.length}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-40">
          <Download className="h-4 w-4" /> Esporta per MUD (Excel)
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Totale Carichi" value={`${Math.round(totali.carichi).toLocaleString("it-IT")} kg`} color="emerald" />
        <SummaryCard label="Totale Scarichi" value={`${Math.round(totali.scarichi).toLocaleString("it-IT")} kg`} color="orange" />
        <SummaryCard label="Giacenza netta" value={`${Math.round(totali.carichi - totali.scarichi).toLocaleString("it-IT")} kg`} color="blue" />
        <SummaryCard label="CER movimentati" value={String(totali.cers)} color="purple" />
      </div>

      <div className="rounded-2xl border border-border/30 bg-card/60 overflow-hidden">
        <div className="p-3 border-b border-border/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Riepilogo per CER — Anno {anno}</h3>
          <span className="text-xs text-muted-foreground">{perCER.length} codici</span>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Caricamento movimenti...
            </div>
          ) : perCER.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Nessun movimento nell'anno {anno}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-background/60 sticky top-0">
                <tr className="border-b border-border/30 text-muted-foreground text-xs uppercase">
                  <th className="text-left p-3">CER</th>
                  <th className="text-left p-3">Descrizione</th>
                  <th className="text-right p-3">Carichi (kg)</th>
                  <th className="text-right p-3">Scarichi (kg)</th>
                  <th className="text-right p-3">Netto (kg)</th>
                </tr>
              </thead>
              <tbody>
                {perCER.map(r => (
                  <tr key={r.cer} className="border-b border-border/10">
                    <td className="p-3 font-mono">{r.cer}</td>
                    <td className="p-3 text-muted-foreground">{r.descrizione || "—"}</td>
                    <td className="p-3 text-right text-emerald-300">{Math.round(r.carichi).toLocaleString("it-IT")}</td>
                    <td className="p-3 text-right text-orange-300">{Math.round(r.scarichi).toLocaleString("it-IT")}</td>
                    <td className="p-3 text-right font-semibold">{Math.round(r.carichi - r.scarichi).toLocaleString("it-IT")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  const cls: Record<string, string> = {
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    orange: "bg-orange-500/10 border-orange-500/30 text-orange-300",
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-300",
    purple: "bg-purple-500/10 border-purple-500/30 text-purple-300",
  };
  return (
    <div className={`rounded-xl border p-3 ${cls[color]}`}>
      <div className="text-[10px] uppercase opacity-70">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
