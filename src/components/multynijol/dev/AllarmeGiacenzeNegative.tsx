import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Loader2, RefreshCw, Wrench, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { dettaglioFormularioRentri } from "@/lib/rentriVpsApi";
import { leggiTutteLePagineFormulari } from "@/lib/rentriFirIntermediario";
import {
  GIACENZE_DATA_LIMITE, MULTY_CF, MULTY_IMPIANTO_UL, MULTY_TENANT, normFir,
  valutaFirPerGiacenze, leggiStatoRegistro, type FirGiacenzaCandidato,
} from "@/lib/rentriFirGiacenze";
import { diagnosiNegativi, proponiSoluzione, fmtKgIt, fmtDataIt } from "@/lib/diagnosiGiacenzeNegative";
import { ConfermaFormularioRegistro } from "@/components/rentri/ConfermaFormularioRegistro";
import { fetchMovimentiSuccessivi, saldiBase21Settembre } from "./GiacenzeDocumentaliModule";

const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const cfNorm = (v: unknown) => String(v ?? "").replace(/\s+/g, "").toUpperCase();

/** Sola lettura sul RENTRI: formulari di carico (Multy destinatario) dei CER indicati. */
async function cercaCarichiRentri(cers: Set<string>): Promise<FirGiacenzaCandidato[]> {
  const { response, items } = await leggiTutteLePagineFormulari(
    "multy", `/formulari/v1.0?identificativo_soggetto=${MULTY_CF}&num_iscr_sito=${MULTY_IMPIANTO_UL}`, "2026-09-22",
  );
  if (!response?.success) throw new Error(response?.userMessage || response?.error || "RENTRI non raggiungibile");
  const out: FirGiacenzaCandidato[] = [];
  for (const it of items as any[]) {
    const dest = Array.isArray(it.destinatari) ? it.destinatari[0] : it.destinatario;
    if (dest && cfNorm(dest.codice_fiscale) !== MULTY_CF) continue;
    const cerLista = String(it.codice_eer ?? it.rifiuto?.codice_eer ?? "").replace(/\D/g, "");
    if (cerLista && !cers.has(cerLista)) continue;
    if (String(it.data_emissione ?? "").slice(0, 10) <= GIACENZE_DATA_LIMITE || !it.numero_fir) continue;
    let raw = it;
    if (!it.accettazione || !cerLista) {
      const d = await dettaglioFormularioRentri("multy", String(it.numero_fir), MULTY_CF, MULTY_IMPIANTO_UL);
      if (d.success && d.data && typeof d.data === "object") raw = { ...it, ...(d.data as any) };
    }
    const c = valutaFirPerGiacenze(raw);
    if (c && c.segno === "CARICO" && cers.has(c.cer)) out.push(c);
  }
  const stato = await leggiStatoRegistro(out.map((c) => c.numero_fir));
  return out.filter((c) => !stato.get(normFir(c.numero_fir))?.registrato);
}

/** Allarme + pulsante RISOLVI: spiega il motivo e propone la soluzione. Non corregge nulla da solo. */
export function AllarmeGiacenzeNegative() {
  const [open, setOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: movimenti } = useQuery({
    queryKey: ["giacenze-movimenti-live"],
    queryFn: fetchMovimentiSuccessivi,
    refetchInterval: 60_000,
  });
  const ricerca = useMutation({ mutationFn: cercaCarichiRentri });
  // Dopo ogni conferma il registro si rilegge e il formulario sparisce dall'elenco.
  const numeri = (ricerca.data ?? []).map((c) => c.numero_fir);
  const { data: statoRegistro } = useQuery({
    queryKey: ["allarme-giacenze-stato-registro", numeri],
    queryFn: () => leggiStatoRegistro(numeri),
    enabled: numeri.length > 0,
  });
  const inSospeso = (ricerca.data ?? []).filter((c) => !statoRegistro?.get(normFir(c.numero_fir))?.registrato);

  if (!movimenti) return null;
  const diagnosi = diagnosiNegativi(saldiBase21Settembre(), movimenti, oggi());
  if (!diagnosi.length) return null;

  const apri = () => {
    setOpen(true);
    if (!ricerca.data && !ricerca.isPending) ricerca.mutate(new Set(diagnosi.map((d) => d.cer)));
  };
  const vaiA = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab); next.delete("sub");
    setSearchParams(next, { replace: true });
    setOpen(false);
  };

  return (
    <>
      <div role="alert" className="mb-4 rounded-xl border-8 border-destructive bg-destructive p-6 text-destructive-foreground shadow-2xl">
        <div className="flex flex-wrap items-center gap-4">
          <AlertTriangle className="h-20 w-20 shrink-0 animate-pulse" />
          <div className="min-w-0 flex-1">
            <p className="text-4xl font-black uppercase leading-tight md:text-5xl">⚠ Giacenze in negativo!</p>
            <p className="mt-2 text-xl font-bold">{diagnosi.length} CER sotto zero. Premi RISOLVI per vedere il motivo e sistemarlo.</p>
          </div>
          <Button size="lg" variant="secondary" onClick={apri} className="h-16 gap-3 px-8 text-2xl font-black uppercase">
            <Wrench className="h-8 w-8" /> Risolvi
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {diagnosi.map((d) => (
            <span key={d.cer} className="rounded-md bg-background px-3 py-1 text-lg font-black text-destructive">
              {d.cer}: {fmtKgIt(d.saldo)} kg
            </span>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Risolvi le giacenze in negativo</DialogTitle>
            <DialogDescription>
              Per ogni CER trovi il motivo e i formulari di carico arrivati sul RENTRI ma non ancora confermati.
              Niente viene cambiato finché non premi tu «Conferma registro e giacenze».
            </DialogDescription>
          </DialogHeader>

          {ricerca.isPending && (
            <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Cerco sul RENTRI i formulari di carico non confermati…</p>
          )}
          {ricerca.isError && (
            <div role="status" className="rounded-md border border-destructive p-3 text-sm">
              Non sono riuscito a leggere il RENTRI: {(ricerca.error as Error).message}
              <Button size="sm" variant="outline" className="ml-2 gap-1" onClick={() => ricerca.mutate(new Set(diagnosi.map((d) => d.cer)))}>
                <RefreshCw className="h-3 w-3" /> Riprova
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {diagnosi.map((d) => {
              const s = ricerca.data ? proponiSoluzione(d, inSospeso) : null;
              return (
                <section key={d.cer} aria-label={`CER ${d.cer}`} className="space-y-3 rounded-lg border-2 border-destructive/60 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xl font-black">CER {d.cer}</h3>
                    <span className="text-lg font-black text-destructive">{fmtKgIt(d.saldo)} kg · mancano {fmtKgIt(d.mancano)} kg</span>
                  </div>
                  {s ? <p className="text-sm">{s.motivo}</p> : !ricerca.isPending && <p className="text-sm">
                    Dal 22/09 usciti {fmtKgIt(d.scarichi)} kg, entrati {fmtKgIt(d.carichi)} kg (giacenza al 21/09: {fmtKgIt(d.base)} kg).
                  </p>}

                  {d.scarichiCausa.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer font-semibold">Uscite che lo hanno portato sotto zero ({d.scarichiCausa.length})</summary>
                      <ul className="mt-1 space-y-0.5 pl-4">
                        {d.scarichiCausa.map((m, i) => (
                          <li key={i}>{fmtDataIt(m.data)} · {m.rif ?? "Movimento"} · −{fmtKgIt(m.scarico)} kg</li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {s && s.pronti.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-semibold">Formulari di carico da confermare:</p>
                      {s.pronti.map((c) => (
                        <div key={c.numero_fir} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted p-2 text-sm">
                          <span><span className="font-mono font-bold">{c.numero_fir}</span> · arrivato {fmtDataIt(c.data_arrivo)} · {c.controparte || c.produttore} · <b>{fmtKgIt(c.kg_accettati)} kg</b></span>
                          <ConfermaFormularioRegistro numeroFir={c.numero_fir} tenantId={MULTY_TENANT} />
                        </div>
                      ))}
                    </div>
                  )}
                  {s && s.inArrivo.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      In attesa di accettazione sul RENTRI: {s.inArrivo.map((c) => c.numero_fir).join(", ")}
                    </p>
                  )}
                  {s && !s.risolvibile && (
                    <Button variant="outline" className="gap-2" onClick={() => vaiA("carico-lavorazione")}>
                      Registra un carico di lavorazione
                    </Button>
                  )}
                  {s?.risolvibile && (
                    <p className="flex items-center gap-1 text-sm font-semibold text-primary"><CheckCircle2 className="h-4 w-4" /> Confermando questi formulari il problema si risolve.</p>
                  )}
                </section>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" className="gap-2" disabled={ricerca.isPending} onClick={() => ricerca.mutate(new Set(diagnosi.map((d) => d.cer)))}>
              <RefreshCw className="h-4 w-4" /> Ricontrolla il RENTRI
            </Button>
            <Button onClick={() => setOpen(false)}>Chiudi</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
