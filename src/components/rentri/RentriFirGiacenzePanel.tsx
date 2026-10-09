import { useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dettaglioFormularioRentri } from "@/lib/rentriVpsApi";
import { leggiTutteLePagineFormulari } from "@/lib/rentriFirIntermediario";
import {
  GIACENZE_DATA_LIMITE, MULTY_CF, MULTY_IMPIANTO_UL, normFir,
  valutaFirPerGiacenze, leggiStatoRegistro, registraFirInGiacenze,
  type FirGiacenzaCandidato, type StatoRegistro,
} from "@/lib/rentriFirGiacenze";

const fmtKg = (n: number) => n.toLocaleString("it-IT", { maximumFractionDigits: 2 });
const fmtD = (d: string) => (d ? d.split("-").reverse().join("/") : "—");

export function RentriFirGiacenzePanel() {
  const [righe, setRighe] = useState<FirGiacenzaCandidato[]>([]);
  const [stato, setStato] = useState<Map<string, StatoRegistro>>(new Map());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const carica = async () => {
    setLoading(true);
    try {
      const { response: res, items } = await leggiTutteLePagineFormulari(
        "multy",
        `/formulari/v1.0?identificativo_soggetto=${MULTY_CF}&num_iscr_sito=${MULTY_IMPIANTO_UL}&data_emissione_da=2026-09-22`,
      );
      if (!res?.success) throw new Error(res?.userMessage || res?.error || "RENTRI non raggiungibile");
      // L'elenco può non contenere l'accettazione: per i formulari dopo il 21/09
      // senza accettazione si rilegge il dettaglio (solo lettura).
      const completi: any[] = [];
      for (const it of items as any[]) {
        const em = String(it.data_emissione ?? "").slice(0, 10);
        if (!it.accettazione && em > GIACENZE_DATA_LIMITE && it.numero_fir) {
          const d = await dettaglioFormularioRentri("multy", String(it.numero_fir), MULTY_CF, MULTY_IMPIANTO_UL);
          const det = d.success && d.data && typeof d.data === "object" ? (d.data as any) : null;
          completi.push(det ? { ...it, ...det } : it);
        } else completi.push(it);
      }
      const valutati = completi.map(valutaFirPerGiacenze).filter(Boolean) as FirGiacenzaCandidato[];
      toast.success(`Letti ${items.length} formulari dal RENTRI, ${valutati.length} riguardano Multy Impianto`);
      valutati.sort((a, b) => a.data_emissione.localeCompare(b.data_emissione) || a.numero_fir.localeCompare(b.numero_fir));
      setRighe(valutati);
      setStato(await leggiStatoRegistro(valutati.map((v) => v.numero_fir)));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const daRegistrare = righe.filter((r) => r.idoneo && !stato.get(normFir(r.numero_fir))?.registrato);

  const registra = async (lista: FirGiacenzaCandidato[]) => {
    const tot = lista.reduce((s, r) => s + (r.segno === "CARICO" ? r.kg_accettati : -r.kg_accettati), 0);
    if (!window.confirm(
      `Registro ${lista.length} formulari nelle giacenze Multy Impianto (variazione totale ${fmtKg(tot)} kg).\n` +
      `Solo formulari dopo il 21/09 già accettati. Le giacenze fino al 21/09 non vengono toccate. Confermi?`,
    )) return;
    setBusy(lista.length === 1 ? lista[0].numero_fir : "tutti");
    let ok = 0; const errori: string[] = [];
    for (const r of lista) {
      try { await registraFirInGiacenze(r, stato.get(normFir(r.numero_fir))); ok++; }
      catch (e: any) { errori.push(`${r.numero_fir}: ${e.message}`); }
    }
    setStato(await leggiStatoRegistro(righe.map((v) => v.numero_fir)));
    setBusy(null);
    if (ok) toast.success(`${ok} formulari registrati nelle giacenze`);
    if (errori.length) toast.error(errori.join("\n"));
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Formulari letti ora dal RENTRI in cui Multy Impianto è produttore (scarico) o destinatario (carico).
        Si registrano solo quelli emessi e arrivati dopo il {fmtD(GIACENZE_DATA_LIMITE)} e già accettati, con i kg accettati dal destinatario.
        Nulla si registra senza il tuo click.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={carica} disabled={loading} variant="secondary">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Leggi dal RENTRI
        </Button>
        <Button onClick={() => registra(daRegistrare)} disabled={!daRegistrare.length || !!busy}>
          {busy === "tutti" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
          Registra tutti i non registrati ({daRegistrare.length})
        </Button>
      </div>
      {righe.length > 0 && (
        <div className="overflow-auto rounded-xl border border-border/30">
          <table className="w-full text-xs">
            <thead className="bg-secondary/40 text-muted-foreground">
              <tr>{["Emissione", "Arrivo", "Numero FIR", "Movimento", "CER", "Kg accettati", "Controparte", "Stato", ""].map((h) => <th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr>
            </thead>
            <tbody>
              {righe.map((r) => {
                const s = stato.get(normFir(r.numero_fir));
                return (
                  <tr key={r.numero_fir} className="border-t border-border/20">
                    <td className="px-2 py-1">{fmtD(r.data_emissione)}</td>
                    <td className="px-2 py-1">{fmtD(r.data_arrivo)}</td>
                    <td className="px-2 py-1 font-mono">{r.numero_fir}</td>
                    <td className="px-2 py-1">{r.segno === "CARICO" ? "Carico" : "Scarico"}</td>
                    <td className="px-2 py-1">{r.cer}</td>
                    <td className="px-2 py-1 text-right">{fmtKg(r.kg_accettati)}</td>
                    <td className="px-2 py-1">{r.controparte}</td>
                    <td className="px-2 py-1">
                      {s?.registrato ? <Badge variant="secondary">Già nelle giacenze</Badge>
                        : r.idoneo ? <Badge>Da registrare</Badge>
                        : <span className="text-muted-foreground">{r.motivo}</span>}
                    </td>
                    <td className="px-2 py-1">
                      {r.idoneo && !s?.registrato && (
                        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => registra([r])}>
                          {busy === r.numero_fir ? <Loader2 className="h-3 w-3 animate-spin" /> : "Registra"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
