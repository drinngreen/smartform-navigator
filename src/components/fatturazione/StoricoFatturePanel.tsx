import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, FileSpreadsheet, History } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { exportToExcel } from "@/lib/exportUtils";
import { useSelezioneElenco } from "@/hooks/useSelezioneElenco";

/** Riga dello storico fatture importato (tabella fatture_storico, sola consultazione). */
interface FatturaStorico {
  id: string;
  numero: string;
  data_documento: string;
  tipo: "fattura" | "nota_credito" | "acconto";
  ragione_sociale: string | null;
  cf_piva: string | null;
  imponibile: number;
  totale: number;
  kg: number | null;
  citta: string | null;
  provincia: string | null;
  pagamento: string | null;
}

const COLONNE = "id,numero,data_documento,tipo,ragione_sociale,cf_piva,imponibile,totale,kg,citta,provincia,pagamento";
const eur = (v: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v || 0);
const num = (v: number) => new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(v || 0);
const dataIt = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const TIPO_LABEL: Record<FatturaStorico["tipo"], string> = { fattura: "Fattura", nota_credito: "Nota di credito", acconto: "Acconto" };

/** Legge tutto lo storico a pagine da 1000 righe (limite del database). */
async function leggiStorico(): Promise<FatturaStorico[]> {
  const out: FatturaStorico[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await (supabase as any)
      .from("fatture_storico")
      .select(COLONNE)
      .order("data_documento", { ascending: false })
      .order("numero", { ascending: false })
      .range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    out.push(...((data || []) as FatturaStorico[]).map((r) => ({ ...r, imponibile: Number(r.imponibile) || 0, totale: Number(r.totale) || 0, kg: r.kg == null ? null : Number(r.kg) })));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export function StoricoFatturePanel() {
  const { data: righe = [], isLoading, error } = useQuery({ queryKey: ["fatture-storico"], queryFn: leggiStorico, staleTime: 5 * 60_000 });
  const [cerca, setCerca] = useState("");
  const [anno, setAnno] = useState("tutti");
  const [tipo, setTipo] = useState("tutti");
  const [aperta, setAperta] = useState<FatturaStorico | null>(null);
  const selezione = useSelezioneElenco();

  const anni = useMemo(() => [...new Set(righe.map((r) => r.data_documento.slice(0, 4)))].sort().reverse(), [righe]);

  const visibili = useMemo(() => {
    const termini = cerca.toLowerCase().split(/\s+/).filter(Boolean);
    return righe.filter((r) => {
      if (anno !== "tutti" && !r.data_documento.startsWith(anno)) return false;
      if (tipo !== "tutti" && r.tipo !== tipo) return false;
      if (!termini.length) return true;
      const testo = [r.numero, r.ragione_sociale, r.cf_piva, r.citta].join(" ").toLowerCase();
      return termini.every((t) => testo.includes(t));
    });
  }, [righe, cerca, anno, tipo]);

  const totali = useMemo(() => {
    const t = { fatture: 0, note: 0, imponibile: 0, totale: 0, kg: 0, clienti: new Set<string>() };
    for (const r of visibili) {
      if (r.tipo === "nota_credito") t.note++;
      else t.fatture++;
      t.imponibile += r.imponibile;
      t.totale += r.totale;
      // i kg delle note di credito non si sommano: sono già nella fattura stornata
      if (r.tipo !== "nota_credito") t.kg += r.kg || 0;
      t.clienti.add(r.cf_piva || r.ragione_sociale || "");
    }
    return t;
  }, [visibili]);

  /** Totale per cliente nella selezione corrente (i primi 10). */
  const perCliente = useMemo(() => {
    const m = new Map<string, { nome: string; imponibile: number; n: number }>();
    for (const r of visibili) {
      const k = r.cf_piva || r.ragione_sociale || "?";
      const v = m.get(k) ?? { nome: r.ragione_sociale || k, imponibile: 0, n: 0 };
      v.imponibile += r.imponibile;
      if (r.tipo !== "nota_credito") v.n++;
      m.set(k, v);
    }
    return [...m.values()].sort((a, b) => b.imponibile - a.imponibile).slice(0, 10);
  }, [visibili]);

  const esporta = () =>
    exportToExcel(
      visibili.map((r) => ({ ...r, data: dataIt(r.data_documento), tipoLabel: TIPO_LABEL[r.tipo] })),
      [
        { header: "Numero", key: "numero", width: 14 },
        { header: "Data", key: "data", width: 12 },
        { header: "Tipo", key: "tipoLabel", width: 14 },
        { header: "Cliente", key: "ragione_sociale", width: 40 },
        { header: "P.IVA / CF", key: "cf_piva", width: 18 },
        { header: "Imponibile", key: "imponibile", width: 14 },
        { header: "Totale", key: "totale", width: 14 },
        { header: "Kg", key: "kg", width: 10 },
        { header: "Città", key: "citta", width: 20 },
        { header: "Pagamento", key: "pagamento", width: 28 },
      ],
      `storico_fatture_${anno}`,
      "Storico fatture",
    );

  if (isLoading)
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Caricamento storico fatture…
      </div>
    );
  if (error) return <p className="p-6 text-sm text-red-300">Storico fatture non leggibile: {(error as Error).message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border/30 bg-card/40 p-4">
        <History className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Storico delle fatture emesse da Multyproget dal 1° gennaio 2024, importato dall'elenco del gestionale. Solo consultazione: non viene inviato a Sibill.
          Le fatture fino ad aprile 2026 sono nel cassetto fiscale.
        </p>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-lg border border-border/40 bg-secondary/40 px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={cerca}
            onChange={(e) => setCerca(e.target.value)}
            placeholder="Cerca cliente, partita IVA, numero o città"
            className="w-full bg-transparent py-2 text-sm focus:outline-none"
          />
        </div>
        <select value={anno} onChange={(e) => setAnno(e.target.value)} className="rounded-lg border border-border/40 bg-secondary/40 px-3 py-2 text-sm">
          <option value="tutti">Tutti gli anni</option>
          {anni.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-border/40 bg-secondary/40 px-3 py-2 text-sm">
          <option value="tutti">Fatture e note di credito</option>
          <option value="fattura">Solo fatture</option>
          <option value="nota_credito">Solo note di credito</option>
          <option value="acconto">Solo acconti</option>
        </select>
        <button onClick={esporta} className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20">
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </button>
      </div>

      {/* Totali della selezione */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          ["Fatture", num(totali.fatture)],
          ["Note di credito", num(totali.note)],
          ["Imponibile netto", eur(totali.imponibile)],
          ["Kg fatturati", num(totali.kg)],
          ["Clienti", num(totali.clienti.size)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-border/30 bg-card/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
            <p className="text-lg font-semibold">{v}</p>
          </div>
        ))}
      </div>

      {perCliente.length > 1 && (
        <details className="rounded-xl border border-border/30 bg-card/40 p-3">
          <summary className="cursor-pointer text-sm font-medium">Primi 10 clienti per imponibile nella selezione</summary>
          <table className="mt-2 w-full text-xs">
            <tbody>
              {perCliente.map((c) => (
                <tr key={c.nome} className="border-t border-border/20">
                  <td className="py-1.5 pr-2">{c.nome}</td>
                  <td className="py-1.5 pr-2 text-right text-muted-foreground">{c.n} fatture</td>
                  <td className="py-1.5 text-right font-mono">{eur(c.imponibile)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {/* Elenco */}
      <div className="max-h-[600px] overflow-auto rounded-xl border border-border/30">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-secondary">
            <tr>
              {["Numero", "Data", "Tipo", "Cliente", "Città", "Imponibile", "Totale", "Kg"].map((h) => (
                <th key={h} className={`px-3 py-2 text-left whitespace-nowrap ${["Imponibile", "Totale", "Kg"].includes(h) ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibili.slice(0, 1000).map((r) => (
              <tr key={r.id} className="cursor-pointer border-t border-border/20 hover:bg-muted/20" {...selezione.propsVoce(r.id, () => setAperta(r))}>
                <td className="px-3 py-1.5 font-mono whitespace-nowrap">{r.numero}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{dataIt(r.data_documento)}</td>
                <td className={`px-3 py-1.5 whitespace-nowrap ${r.tipo === "nota_credito" ? "text-amber-300" : ""}`}>{TIPO_LABEL[r.tipo]}</td>
                <td className="px-3 py-1.5">{r.ragione_sociale || "—"}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{[r.citta, r.provincia].filter(Boolean).join(" ") || "—"}</td>
                <td className="px-3 py-1.5 text-right font-mono whitespace-nowrap">{eur(r.imponibile)}</td>
                <td className="px-3 py-1.5 text-right font-mono whitespace-nowrap">{eur(r.totale)}</td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap">{r.kg == null ? "—" : num(r.kg)}</td>
              </tr>
            ))}
            {!visibili.length && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">Nessuna fattura con questi filtri.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {visibili.length > 1000 && (
        <p className="text-xs text-muted-foreground">Mostrate le prime 1.000 di {num(visibili.length)}: usa i filtri o l'Excel per vederle tutte. I totali sopra contano tutte.</p>
      )}

      {aperta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAperta(null)}>
          <div className="w-full max-w-md space-y-2 rounded-2xl border border-border bg-card p-5 text-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold">{TIPO_LABEL[aperta.tipo]} {aperta.numero}</h3>
            {[
              ["Data", dataIt(aperta.data_documento)],
              ["Cliente", aperta.ragione_sociale || "—"],
              ["P.IVA / CF", aperta.cf_piva || "—"],
              ["Città", [aperta.citta, aperta.provincia].filter(Boolean).join(" ") || "—"],
              ["Imponibile", eur(aperta.imponibile)],
              ["Totale documento", eur(aperta.totale)],
              ["Kg", aperta.kg == null ? "—" : num(aperta.kg)],
              ["Pagamento", aperta.pagamento || "—"],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between gap-4 border-b border-border/20 pb-1">
                <span className="text-muted-foreground">{l}</span>
                <span className="text-right">{v}</span>
              </div>
            ))}
            <button onClick={() => setAperta(null)} className="mt-2 w-full rounded-lg border border-border px-3 py-2 hover:bg-secondary">Chiudi</button>
          </div>
        </div>
      )}
    </div>
  );
}
