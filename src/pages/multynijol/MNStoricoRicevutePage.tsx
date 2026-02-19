import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { Search, FileUp, FileSpreadsheet, Upload } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Ricevuta {
  id: string;
  numero_doc: string;
  data_doc: string;
  tipo_doc: string;
  codice_cliente: string | null;
  ragione_sociale: string;
  codice_fiscale: string | null;
  imponibile: number;
  totale_doc: number;
  quantita_kg: number;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  metodo_pagamento: string | null;
  descrizione_pagamento: string | null;
  stato_ddt: string | null;
  quantita_fatturabile: number;
}

const TENANT_ID = "dc2a6046-d9a8-4549-8e45-82367d695ac6";

const COLS = [
  { header: "N. Doc", key: "numero_doc", width: 12 },
  { header: "Data", key: "data_doc", width: 14, format: (v: any) => v ? new Date(v).toLocaleDateString("it-IT") : "—" },
  { header: "Ragione Sociale", key: "ragione_sociale", width: 25 },
  { header: "Codice Fiscale", key: "codice_fiscale", width: 20 },
  { header: "Imponibile", key: "imponibile", width: 14, format: (v: any) => `€ ${Number(v || 0).toFixed(2)}` },
  { header: "Totale", key: "totale_doc", width: 14, format: (v: any) => `€ ${Number(v || 0).toFixed(2)}` },
  { header: "Kg", key: "quantita_kg", width: 10 },
  { header: "Città", key: "citta", width: 16 },
  { header: "Prov.", key: "provincia", width: 6 },
  { header: "Pagamento", key: "metodo_pagamento", width: 14 },
];

export default function MNStoricoRicevutePage() {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [importing, setImporting] = useState(false);
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["mn-storico-ricevute"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storico_ricevute_privati" as any)
        .select("*")
        .eq("tenant_id", TENANT_ID)
        .order("data_doc", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const filtered = items.filter((i: Ricevuta) => {
    if (search) {
      const s = search.toLowerCase();
      const match = `${i.ragione_sociale} ${i.codice_fiscale || ""} ${i.numero_doc} ${i.citta || ""}`.toLowerCase().includes(s);
      if (!match) return false;
    }
    if (dateFrom && i.data_doc < dateFrom) return false;
    if (dateTo && i.data_doc > dateTo) return false;
    return true;
  });

  const totalImponibile = filtered.reduce((s, i) => s + Number(i.imponibile || 0), 0);
  const totalKg = filtered.reduce((s, i) => s + Number(i.quantita_kg || 0), 0);

  const parseEuro = (v: string) => {
    if (!v) return 0;
    return parseFloat(String(v).replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
  };

  const importXlsx = async () => {
    setImporting(true);
    try {
      const res = await fetch("/data/elenco_ricevute_fatte_ai_privati.xlsx");
      const ab = await res.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(ws);

      const rows = json.map((r: any) => {
        const rawDate = r["Data"];
        let dataDoc = "2025-01-01";
        if (typeof rawDate === "number") {
          const d = XLSX.SSF.parse_date_code(rawDate);
          dataDoc = `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
        } else if (typeof rawDate === "string" && rawDate.includes("/")) {
          const [dd, mm, yyyy] = rawDate.split("/");
          dataDoc = `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
        }
        return {
          numero_doc: String(r["N. Doc"] || ""),
          data_doc: dataDoc,
          tipo_doc: r["Tipo Doc."] || "ACQ",
          codice_cliente: r["Codice"] ? String(r["Codice"]) : null,
          ragione_sociale: r["Ragione"] || "",
          codice_fiscale: r["Cod. Fiscale"] || null,
          imponibile: parseEuro(String(r["Imponibile"] || "0")),
          totale_doc: parseEuro(String(r["Totale Doc."] || "0")),
          quantita_kg: parseFloat(String(r["Quantita Kg"] || "0").replace(",", ".")) || 0,
          indirizzo: r["Indirizzo"] || null,
          cap: r["CAP"] ? String(r["CAP"]) : null,
          citta: r["Città"] || r["Citta"] || null,
          provincia: r["Prov."] || null,
          peso_netto: parseFloat(String(r["Peso Netto"] || "0").replace(",", ".")) || 0,
          peso_lordo: parseFloat(String(r["Peso Lordo"] || "0").replace(",", ".")) || 0,
          metodo_pagamento: r["Cod.Pagamento"] || null,
          descrizione_pagamento: r["Descr.Pagamento"] || null,
          stato_ddt: r["Stato DDT"] || "U",
          quantita_fatturabile: parseFloat(String(r["Quantità Fatturabile (Kg)"] || "0").replace(",", ".")) || 0,
          tenant_id: TENANT_ID,
        };
      });

      // Insert in batches of 100
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error } = await supabase.from("storico_ricevute_privati" as any).insert(batch as any);
        if (error) throw error;
      }
      toast.success(`Importate ${rows.length} ricevute`);
      qc.invalidateQueries({ queryKey: ["mn-storico-ricevute"] });
    } catch (err: any) {
      toast.error("Errore importazione: " + (err?.message || err));
    } finally {
      setImporting(false);
    }
  };

  return (
    <MNAdminLayout title="Storico Ricevute" subtitle="Privati Cittadini">
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
            <p className="text-xs text-muted-foreground font-mono uppercase">Totale Ricevute</p>
            <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
            <p className="text-xs text-muted-foreground font-mono uppercase">Imponibile Totale</p>
            <p className="text-2xl font-bold text-foreground">€ {totalImponibile.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
            <p className="text-xs text-muted-foreground font-mono uppercase">Kg Totali</p>
            <p className="text-2xl font-bold text-foreground">{totalKg.toLocaleString("it-IT")}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca per ragione sociale, CF, n. doc, città..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-muted-foreground">DA</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-muted-foreground">A</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground" />
          </div>
          <span className="text-xs font-mono text-muted-foreground">{filtered.length} / {items.length}</span>
          {items.length === 0 && (
            <button onClick={importXlsx} disabled={importing}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Upload className="h-3.5 w-3.5" /> {importing ? "Importando..." : "Importa Storico"}
            </button>
          )}
          <div className="flex gap-1">
            <button onClick={() => exportToPdf(filtered, COLS, "storico_ricevute", "Storico Ricevute Privati")}
              className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors" title="Esporta PDF">
              <FileUp className="h-4 w-4" />
            </button>
            <button onClick={() => exportToExcel(filtered, COLS, "storico_ricevute", "Storico Ricevute")}
              className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors" title="Esporta Excel">
              <FileSpreadsheet className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Caricamento...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nessuna ricevuta trovata</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-left">
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">N. Doc</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Data</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Ragione Sociale</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">CF</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Imponibile</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Totale</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Kg</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Città</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Prov.</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item: Ricevuta) => (
                    <tr key={item.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{item.numero_doc}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.data_doc ? new Date(item.data_doc).toLocaleDateString("it-IT") : "—"}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{item.ragione_sociale}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.codice_fiscale || "—"}</td>
                      <td className="px-4 py-3 text-xs text-foreground">€ {Number(item.imponibile || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-foreground">€ {Number(item.totale_doc || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{item.quantita_kg}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.citta || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.provincia || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.metodo_pagamento || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MNAdminLayout>
  );
}
