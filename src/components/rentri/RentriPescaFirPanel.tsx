import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { pescaFormulariRentri, type RisultatoPesca } from "@/lib/rentriPescaFir";
import type { RentriCliente } from "@/lib/rentriVpsApi";

interface Props {
  cliente: RentriCliente;
  tenantId: string;
}

/** Pesca dei formulari dal RENTRI: import idempotente in archivio, differenze in sola lettura. */
export function RentriPescaFirPanel({ cliente, tenantId }: Props) {
  const [dataDa, setDataDa] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dataA, setDataA] = useState(() => new Date().toISOString().slice(0, 10));
  const [conDettaglio, setConDettaglio] = useState(false);
  const [loading, setLoading] = useState(false);
  const [risultato, setRisultato] = useState<RisultatoPesca | null>(null);

  const esegui = async () => {
    if (!window.confirm(`Pescare i formulari RENTRI dal ${dataDa} al ${dataA}?\nI nuovi entrano in archivio, gli esistenti vengono solo riconosciuti; le differenze restano elencate in sola lettura.`)) return;
    setLoading(true);
    setRisultato(null);
    try {
      const res = await pescaFormulariRentri({ cliente, tenantId, dataDa, dataA, conDettaglio });
      setRisultato(res);
      toast.success(`Pesca completata: ${res.nuovi} nuovi, ${res.aggiornati} aggiornati, ${res.letti} letti`);
    } catch (e: unknown) {
      toast.error(`Pesca non riuscita: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs">
          Dal
          <input type="date" value={dataDa} onChange={(e) => setDataDa(e.target.value)} className="mt-1 block rounded border border-border bg-background px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs">
          Al
          <input type="date" value={dataA} onChange={(e) => setDataA(e.target.value)} className="mt-1 block rounded border border-border bg-background px-2 py-1.5 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={conDettaglio} onChange={(e) => setConDettaglio(e.target.checked)} />
          Scarica anche il dettaglio completo (più lento)
        </label>
        <button
          onClick={esegui}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Pesca dal RENTRI
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        I formulari già presenti vengono riconosciuti e aggiornati, quelli nuovi entrano in archivio come documenti da lavorare. Nessun movimento viene creato: i movimenti nascono solo alla firma del destinatario.
      </p>

      {risultato && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-lg bg-secondary/50 px-3 py-1.5">Letti dal RENTRI: <strong>{risultato.letti}</strong></span>
            <span className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-emerald-700">Nuovi importati: <strong>{risultato.nuovi}</strong></span>
            <span className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-amber-700">Aggiornati: <strong>{risultato.aggiornati}</strong></span>
          </div>
          {risultato.differenze.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <h4 className="text-sm font-semibold mb-1">Differenze elencate in sola lettura ({risultato.differenze.length})</h4>
              <ul className="text-xs space-y-1 max-h-40 overflow-auto">
                {risultato.differenze.map((d, i) => <li key={i}>• {d}</li>)}
              </ul>
            </div>
          )}
          {risultato.dettagli.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-secondary/60 uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Numero FIR</th>
                    <th className="text-left px-3 py-2">CER</th>
                    <th className="text-right px-3 py-2">Q.tà</th>
                    <th className="text-left px-3 py-2">Stato RENTRI</th>
                    <th className="text-left px-3 py-2">Esito</th>
                  </tr>
                </thead>
                <tbody>
                  {risultato.dettagli.map((d) => (
                    <tr key={d.numero_fir} className="border-t border-border">
                      <td className="px-3 py-1.5 font-mono">{d.numero_fir}</td>
                      <td className="px-3 py-1.5 font-mono">{d.cer || "—"}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{d.quantita.toLocaleString("it-IT")}</td>
                      <td className="px-3 py-1.5">{d.stato || "—"}</td>
                      <td className="px-3 py-1.5">{d.azione}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
