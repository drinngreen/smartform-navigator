import { useMemo, useState } from "react";
import { Loader2, Search, Handshake, AlertTriangle, FileSpreadsheet, Printer } from "lucide-react";
import { toast } from "sonner";
import { elencoFirIntermediario, type FirIntermediarioRow } from "@/lib/rentriFirIntermediario";
import { RENTRI_CF_SOGGETTO, type RentriCliente } from "@/lib/rentriVpsApi";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";

const oggi = () => new Date().toISOString().slice(0, 10);
const inizioAnno = () => `${new Date().getFullYear()}-01-01`;
const fmtData = (d: string | null) => (d ? String(d).slice(0, 10).split("-").reverse().join("/") : "—");
const fmtKg = (v: number | null) => (v === null || Number.isNaN(v) ? "—" : Number(v).toLocaleString("it-IT"));

const EXPORT_COLS = [
  { header: "Formulario", key: "numeroFir", width: 18 },
  { header: "Data", key: "data", width: 12, format: (v: any) => fmtData(v) },
  { header: "Produttore", key: "produttore", width: 28 },
  { header: "Destinatario", key: "destinatario", width: 28 },
  { header: "EER", key: "eer", width: 10 },
  { header: "Kg", key: "quantitaKg", width: 12, format: (v: any) => fmtKg(v) },
  { header: "Intermediario", key: "intermediario", width: 26, format: (v: any, row: any) => (row.siamoIntermediario ? "NOI" : v || "nessuno") },
];

/**
 * Formulari RENTRI in cui la società risulta INTERMEDIARIO.
 * Solo lettura dal RENTRI: nessun invio, nessuna modifica di registri o giacenze.
 */
export function RentriFirIntermediarioPanel({ cliente = "multy" as RentriCliente }: { cliente?: RentriCliente }) {
  const [dataDa, setDataDa] = useState(inizioAnno());
  const [dataA, setDataA] = useState(oggi());
  const [loading, setLoading] = useState(false);
  const [righe, setRighe] = useState<FirIntermediarioRow[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [soloIntermediario, setSoloIntermediario] = useState(true);

  const cf = RENTRI_CF_SOGGETTO[cliente === "niyol" ? "niyol" : "multy"];

  const cerca = async () => {
    setLoading(true);
    setErrore(null);
    try {
      const { response, righe: rows } = await elencoFirIntermediario(cliente, { dataDa, dataA });
      if (!response.success) {
        setErrore(response.userMessage || response.error || "Il RENTRI non ha risposto.");
        setRighe([]);
        return;
      }
      setRighe(rows);
      const conIntermediario = rows.filter((r) => r.siamoIntermediario).length;
      toast.success(
        conIntermediario
          ? `${conIntermediario} formulari con la nostra società come intermediario.`
          : "Nessun formulario del periodo riporta la nostra società come intermediario.",
      );
    } catch (e: any) {
      setErrore(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const visibili = useMemo(
    () => (righe ?? []).filter((r) => (soloIntermediario ? r.siamoIntermediario : true)),
    [righe, soloIntermediario],
  );

  const totali = useMemo(() => {
    const kg = visibili.reduce((s, r) => s + (r.quantitaKg ?? 0), 0);
    return { righe: visibili.length, kg };
  }, [visibili]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/30 bg-card/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Handshake size={18} className="text-primary" />
          <h3 className="font-display text-base text-foreground">Formulari dal RENTRI con noi come intermediario</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Lettura diretta dal RENTRI (nessun invio). Serve a controllare se chi fa l'intermediazione ci sta davvero
          indicando come intermediario sui formulari. Codice fiscale controllato:{" "}
          <span className="font-mono text-foreground">{cf}</span>.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted-foreground">
            Dal
            <input
              type="date"
              value={dataDa}
              onChange={(e) => setDataDa(e.target.value)}
              className="mt-1 block rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Al
            <input
              type="date"
              value={dataA}
              onChange={(e) => setDataA(e.target.value)}
              className="mt-1 block rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground"
            />
          </label>
          <button
            type="button"
            onClick={() => void cerca()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Cerca sul RENTRI
          </button>
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={soloIntermediario}
              onChange={(e) => setSoloIntermediario(e.target.checked)}
            />
            Mostra solo dove risultiamo intermediario
          </label>
        </div>
      </div>

      {errore && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle size={16} className="mt-0.5" /> {errore}
        </div>
      )}

      {righe && (
        <div className="rounded-2xl border border-border/30 bg-card/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {totali.righe} formulari — {fmtKg(totali.kg)} kg complessivi
              {righe.length !== totali.righe && ` (su ${righe.length} letti dal RENTRI nel periodo)`}
            </p>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                disabled={visibili.length === 0}
                onClick={() => exportToExcel(visibili as any, EXPORT_COLS, `fir-intermediario-${dataDa}_${dataA}`, "FIR Intermediario")}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                <FileSpreadsheet size={13} /> Excel
              </button>
              <button
                type="button"
                disabled={visibili.length === 0}
                onClick={() =>
                  exportToPdf(
                    visibili as any,
                    EXPORT_COLS,
                    `fir-intermediario-${dataDa}_${dataA}`,
                    `Formulari RENTRI con noi intermediario\nPeriodo ${fmtData(dataDa)} — ${fmtData(dataA)} · ${totali.righe} formulari · ${fmtKg(totali.kg)} kg`,
                  )
                }
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                <Printer size={13} /> PDF
              </button>
            </div>
          </div>
          <div className="max-h-[560px] overflow-auto rounded-xl border border-border/30">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary/80 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Formulario</th>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Produttore</th>
                  <th className="px-3 py-2 text-left">Destinatario</th>
                  <th className="px-3 py-2 text-left">EER</th>
                  <th className="px-3 py-2 text-right">Kg</th>
                  <th className="px-3 py-2 text-left">Intermediario indicato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {visibili.map((r, i) => (
                  <tr key={`${r.numeroFir}-${i}`} className="hover:bg-secondary/30">
                    <td className="px-3 py-2 font-mono text-xs">{r.numeroFir || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtData(r.data)}</td>
                    <td className="px-3 py-2">{r.produttore || "—"}</td>
                    <td className="px-3 py-2">{r.destinatario || "—"}</td>
                    <td className="px-3 py-2 font-mono">{r.eer || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtKg(r.quantitaKg)}</td>
                    <td className="px-3 py-2">
                      {r.siamoIntermediario ? (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                          NOI
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{r.intermediario || "nessuno"}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {visibili.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      Nessun formulario in questa vista.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
