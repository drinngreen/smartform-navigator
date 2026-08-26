import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Car, Loader2, RefreshCw, FileDown, FileSpreadsheet, Check, Search } from "lucide-react";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";

type Row = {
  id: string;
  nome_privato: string | null;
  cf_pi: string | null;
  privato_id: string | null;
  targa_automezzo: string | null;
  modello_automezzo: string | null;
  cer: string | null;
  kg_pesati: number | null;
  data: string | null;
  anno_dbt: number | null;
  tenant_id: string | null;
  numero_progressivo: number | null;
  tipo_utenza: string | null;
  note: string | null;
};

type Gruppo = {
  key: string;
  nome: string;
  cf: string;
  privatoIds: string[];
  movimenti: number;
  senzaTarga: number;
  kg: number;
  targaAnagrafica?: string | null;
};

const collator = new Intl.Collator("it", { sensitivity: "base", numeric: true });
const annoDi = (r: Row) => r.anno_dbt ?? (r.data ? new Date(r.data).getFullYear() : null);
const keyOf = (r: Row) => (r.cf_pi || r.nome_privato || "SENZA IDENTIFICATIVO").toString().toUpperCase().trim();

export function PrivatiTargheWidget({ tenantId }: { tenantId?: string }) {
  const anno = new Date().getFullYear();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [soloMancanti, setSoloMancanti] = useState(true);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["privati-targhe-widget", tenantId, anno],
    queryFn: async () => {
      const { data: conf, error } = await supabase
        .from("privati_conferimenti" as any)
        .select(
          "id, nome_privato, cf_pi, privato_id, targa_automezzo, modello_automezzo, cer, kg_pesati, data, anno_dbt, tenant_id, numero_progressivo, tipo_utenza, note",
        )
        .range(0, 9999);
      if (error) throw error;

      const rows = ((conf || []) as unknown as Row[])
        .filter((r) => annoDi(r) === anno)
        .filter((r) => (tenantId ? r.tenant_id === tenantId : true));

      const ids = Array.from(new Set(rows.map((r) => r.privato_id).filter(Boolean))) as string[];
      const anagrafica = new Map<string, { targa?: string | null; cf?: string | null }>();
      if (ids.length) {
        const { data: anag } = await supabase
          .from("anagrafica_privati" as any)
          .select("id, targa_automezzo, codice_fiscale")
          .in("id", ids);
        for (const a of ((anag || []) as any[])) {
          anagrafica.set(a.id, { targa: a.targa_automezzo, cf: a.codice_fiscale });
        }
      }

      const map = new Map<string, Gruppo>();
      for (const r of rows) {
        const k = keyOf(r);
        const g = map.get(k) || {
          key: k,
          nome: r.nome_privato || k,
          cf: r.cf_pi || "",
          privatoIds: [],
          movimenti: 0,
          senzaTarga: 0,
          kg: 0,
          targaAnagrafica: null,
        };
        g.movimenti += 1;
        g.kg += Number(r.kg_pesati) || 0;
        if (!r.targa_automezzo?.trim()) g.senzaTarga += 1;
        if (r.privato_id && !g.privatoIds.includes(r.privato_id)) g.privatoIds.push(r.privato_id);
        if (!g.targaAnagrafica && r.privato_id) g.targaAnagrafica = anagrafica.get(r.privato_id)?.targa || null;
        map.set(k, g);
      }

      const gruppi = Array.from(map.values()).sort((a, b) => collator.compare(a.nome, b.nome));
      return {
        rows,
        gruppi,
        totMovimenti: rows.length,
        totSenzaTarga: rows.filter((r) => !r.targa_automezzo?.trim()).length,
      };
    },
    refetchInterval: 60_000,
  });

  const gruppi = useMemo(() => {
    const base = data?.gruppi ?? [];
    const f = filtro.trim().toUpperCase();
    return base
      .filter((g) => (soloMancanti ? g.senzaTarga > 0 : true))
      .filter((g) => (f ? `${g.nome} ${g.cf}`.toUpperCase().includes(f) : true));
  }, [data, filtro, soloMancanti]);

  const salvaTarga = async (g: Gruppo) => {
    const targa = (drafts[g.key] ?? "").trim().toUpperCase();
    if (!targa) return toast.error("Inserisci una targa");
    setSavingKey(g.key);
    try {
      // 1) anagrafica privati (per id o per codice fiscale) — con verifica righe scritte
      let anagAggiornate = 0;
      if (g.privatoIds.length) {
        const { data: upd, error } = await supabase
          .from("anagrafica_privati" as any)
          .update({ targa_automezzo: targa } as any)
          .in("id", g.privatoIds)
          .select("id");
        if (error) throw error;
        anagAggiornate = (upd || []).length;
      } else if (g.cf) {
        const { data: upd, error } = await supabase
          .from("anagrafica_privati" as any)
          .update({ targa_automezzo: targa } as any)
          .eq("codice_fiscale", g.cf)
          .select("id");
        if (error) throw error;
        anagAggiornate = (upd || []).length;
      }

      // 2) movimenti privi di targa dello stesso soggetto — con verifica righe scritte
      const idsDaAggiornare = (data?.rows ?? [])
        .filter((r) => keyOf(r) === g.key && !r.targa_automezzo?.trim())
        .map((r) => r.id);
      let movAggiornati = 0;
      if (idsDaAggiornare.length) {
        const { data: upd, error } = await supabase
          .from("privati_conferimenti" as any)
          .update({ targa_automezzo: targa } as any)
          .in("id", idsDaAggiornare)
          .select("id");
        if (error) throw error;
        movAggiornati = (upd || []).length;
      }

      if (movAggiornati === 0 && anagAggiornate === 0) {
        toast.error(
          "Nessuna riga aggiornata: permessi insufficienti sul database. Rientra come amministratore Multy Dev e riprova.",
        );
        return;
      }
      if (idsDaAggiornare.length && movAggiornati < idsDaAggiornare.length) {
        toast.warning(`Aggiornati solo ${movAggiornati}/${idsDaAggiornare.length} movimenti (permessi parziali)`);
      } else {
        toast.success(`Targa ${targa} salvata — ${movAggiornati} movimenti + ${anagAggiornate} anagrafiche aggiornate`);
      }

      setDrafts((d) => ({ ...d, [g.key]: "" }));
      await refetch();
      // aggiorna anche gli altri pannelli privati (limiti, elenco conferimenti, ricevute)
      queryClient.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey).toLowerCase().includes("privat") });
    } catch (e: any) {
      toast.error(e.message || "Errore salvataggio targa");
    } finally {
      setSavingKey(null);
    }
  };

  const rimuoviTarga = async (g: Gruppo) => {
    if (!window.confirm(`Rimuovere la targa da ${g.nome}? Il soggetto tornerà nell'elenco delle targhe mancanti.`)) return;
    setSavingKey(g.key);
    try {
      if (g.privatoIds.length) {
        await supabase.from("anagrafica_privati" as any).update({ targa_automezzo: null } as any).in("id", g.privatoIds);
      } else if (g.cf) {
        await supabase.from("anagrafica_privati" as any).update({ targa_automezzo: null } as any).eq("codice_fiscale", g.cf);
      }
      const ids = (data?.rows ?? []).filter((r) => keyOf(r) === g.key).map((r) => r.id);
      if (ids.length) {
        const { error } = await supabase
          .from("privati_conferimenti" as any)
          .update({ targa_automezzo: null } as any)
          .in("id", ids)
          .select("id");
        if (error) throw error;
      }
      toast.success(`Targa rimossa da ${g.nome}`);
      await refetch();
      queryClient.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey).toLowerCase().includes("privat") });
    } catch (e: any) {
      toast.error(e.message || "Errore rimozione targa");
    } finally {
      setSavingKey(null);
    }
  };

  const COLONNE = [
    { header: "N.", key: "n", width: 8 },
    { header: "Data", key: "data", width: 14 },
    { header: "Progr. DBT", key: "progressivo", width: 12 },
    { header: "Privato", key: "nome", width: 38 },
    { header: "Cod. Fiscale / P.IVA", key: "cf", width: 24 },
    { header: "Tipo utenza", key: "tipo", width: 16 },
    { header: "CER", key: "cer", width: 12 },
    {
      header: "Kg",
      key: "kg",
      width: 14,
      format: (v: any) => Number(v || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 }),
    },
    { header: "TARGA", key: "targa", width: 16 },
    { header: "Mezzo", key: "modello", width: 20 },
    { header: "Note", key: "note", width: 30 },
  ] as any;

  const buildExport = () => {
    const rows = [...(data?.rows ?? [])].sort((a, b) => {
      const d = (a.data || "").localeCompare(b.data || "");
      return d !== 0 ? d : collator.compare(a.nome_privato || "", b.nome_privato || "");
    });
    return rows.map((r, i) => ({
      n: i + 1,
      data: r.data ? new Date(r.data).toLocaleDateString("it-IT") : "—",
      progressivo: r.numero_progressivo ?? "—",
      nome: r.nome_privato || "—",
      cf: r.cf_pi || "—",
      tipo: r.tipo_utenza || "—",
      cer: r.cer || "—",
      kg: Number(r.kg_pesati) || 0,
      targa: r.targa_automezzo?.trim() || "DA ASSEGNARE",
      modello: r.modello_automezzo || "—",
      note: r.note || "",
    }));
  };

  const intestazione = () => {
    const righe = data?.rows ?? [];
    const kg = righe.reduce((s, r) => s + (Number(r.kg_pesati) || 0), 0);
    const ora = new Date();
    return (
      `MOVIMENTI PRIVATI ${anno} — REGISTRO CARICO CONFERIMENTI\n` +
      `${righe.length} movimenti · ${kg.toLocaleString("it-IT", { minimumFractionDigits: 2 })} kg · ` +
      `${data?.totSenzaTarga ?? 0} movimenti ancora senza targa\n` +
      `Generato il ${ora.toLocaleDateString("it-IT")} ore ${ora.toLocaleTimeString("it-IT")}`
    );
  };

  const esportaPdf = () => {
    const rows = buildExport();
    if (!rows.length) return toast.error("Nessun movimento privato per l'anno corrente");
    exportToPdf(rows, COLONNE, `movimenti-privati-${anno}`, intestazione());
    toast.success(`PDF generato — ${rows.length} movimenti`);
  };

  const esportaExcel = () => {
    const rows = buildExport();
    if (!rows.length) return toast.error("Nessun movimento privato per l'anno corrente");
    exportToExcel(rows, COLONNE, `movimenti-privati-${anno}`, "Movimenti", intestazione().split("\n"));
    toast.success(`Excel generato — ${rows.length} movimenti`);
  };

  if (isLoading) {
    return (
      <div className="p-4 rounded-2xl border border-border/30 bg-card/60 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Caricamento targhe privati...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/5 to-emerald-500/5 p-4 space-y-3">
      <div className="flex items-start gap-2 flex-wrap">
        <Car className="h-5 w-5 text-sky-400 mt-0.5" />
        <div className="flex-1 min-w-[220px]">
          <h3 className="text-sm font-semibold text-foreground">Targhe Privati — assegnazione rapida ed export movimenti</h3>
          <p className="text-xs text-muted-foreground">
            {data?.totMovimenti ?? 0} movimenti {anno} · {data?.totSenzaTarga ?? 0} senza targa ·{" "}
            {gruppi.length} soggetti in elenco
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs hover:bg-sky-500/30 disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Aggiorna
          </button>
          <button
            onClick={esportaPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-emerald-950 font-semibold text-xs hover:bg-emerald-400 shadow"
          >
            <FileDown className="h-4 w-4" /> ESPORTA MOVIMENTI PDF
          </button>
          <button
            onClick={esportaExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs hover:bg-emerald-500/30"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Cerca privato o codice fiscale..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-background/60 border border-border/50 text-xs text-foreground"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={soloMancanti} onChange={(e) => setSoloMancanti(e.target.checked)} />
          Solo privati con targhe mancanti
        </label>
      </div>

      {gruppi.length === 0 ? (
        <div className="p-3 text-center text-sm text-muted-foreground">
          {soloMancanti ? "Tutte le targhe risultano assegnate ✅" : "Nessun privato trovato"}
        </div>
      ) : (
        <div className="space-y-2 max-h-[26rem] overflow-y-auto">
          {gruppi.map((g) => (
            <div
              key={g.key}
              className={`p-3 rounded-xl border flex items-center gap-3 flex-wrap ${
                g.senzaTarga > 0 ? "bg-amber-500/10 border-amber-500/40" : "bg-emerald-500/10 border-emerald-500/30"
              }`}
            >
              <div className="min-w-0 flex-1">
                <strong className="text-foreground text-sm">{g.nome}</strong>
                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="font-mono">{g.cf || "senza CF"}</span>
                  <span>{g.movimenti} movimenti</span>
                  <span className={g.senzaTarga > 0 ? "text-amber-300 font-semibold" : "text-emerald-300"}>
                    {g.senzaTarga > 0 ? `${g.senzaTarga} senza targa` : "targhe complete"}
                  </span>
                  {g.targaAnagrafica && <span className="font-mono text-sky-300">anagrafica: {g.targaAnagrafica}</span>}
                </div>
              </div>
              <input
                value={drafts[g.key] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [g.key]: e.target.value.toUpperCase() }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") salvaTarga(g);
                }}
                placeholder={g.targaAnagrafica || "TARGA"}
                maxLength={15}
                className="w-36 px-3 py-2 rounded-lg bg-background/70 border border-border/60 text-sm font-mono uppercase text-foreground"
              />
              <button
                onClick={() => salvaTarga(g)}
                disabled={savingKey === g.key || !(drafts[g.key] ?? "").trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs hover:bg-emerald-500/30 disabled:opacity-40"
              >
                {savingKey === g.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Salva targa
              </button>
              {g.senzaTarga < g.movimenti && (
                <button
                  onClick={() => rimuoviTarga(g)}
                  disabled={savingKey === g.key}
                  className="px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs hover:bg-rose-500/25 disabled:opacity-40"
                >
                  Rimuovi targa
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
