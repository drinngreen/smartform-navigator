import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dettaglioFormularioRentri, type RentriCliente } from "@/lib/rentriVpsApi";
import {
  MULTY_TENANT, NIYOL_TENANT, normFir,
  valutaFirPerGiacenze, valutaFirPerRegistroNiyol,
  leggiStatoRegistro, leggiStatoRegistroNiyol,
  registraFirInGiacenze, registraFirInRegistroNiyol,
  type FirGiacenzaCandidato,
} from "@/lib/rentriFirGiacenze";

/** Manual action shared by the two office editors; opening never writes. */
export function ConfermaFormularioRegistro({ numeroFir, tenantId, cartaceo = false }: {
  numeroFir?: string | null;
  tenantId?: string;
  cartaceo?: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [candidato, setCandidato] = useState<FirGiacenzaCandidato | null>(null);
  const [motivo, setMotivo] = useState("");
  const lock = useRef(false);
  const niyol = tenantId === NIYOL_TENANT;
  const supportato = tenantId === MULTY_TENANT || niyol;
  const cliente: RentriCliente = niyol ? "niyol" : "multy";
  const leggiStato = niyol ? leggiStatoRegistroNiyol : leggiStatoRegistro;

  const leggi = async () => {
    if (!numeroFir) throw new Error("Numero formulario mancante");
    const res = await dettaglioFormularioRentri(cliente, numeroFir);
    if (!res.success || !res.data || typeof res.data !== "object") {
      throw new Error(res.userMessage || res.error || "Dettaglio RENTRI non disponibile");
    }
    const raw = res.data as Record<string, any>;
    if (normFir(raw.numero_fir ?? raw.dati_partenza?.numero_fir ?? numeroFir) !== normFir(numeroFir)) {
      throw new Error("Il dettaglio non corrisponde al formulario selezionato");
    }
    const c = niyol
      ? valutaFirPerRegistroNiyol({
          ...raw, ...raw.dati_partenza, numero_fir: numeroFir,
          codice_eer: raw.codice_eer ?? raw.dati_partenza?.rifiuto?.codice_eer,
          accettazione: raw.accettazione ?? (raw.dati_accettazione ? {
            data_ora_arrivo: raw.dati_accettazione.data_ora_arrivo,
            quantita_accettata: raw.dati_accettazione.quantita_accettata?.valore ?? raw.dati_accettazione.quantita_accettata,
          } : null),
          unita_misura: raw.dati_accettazione?.quantita_accettata?.unita_misura ?? raw.unita_misura,
        })
      : valutaFirPerGiacenze({ ...raw, numero_fir: numeroFir });
    if (!c) throw new Error("Il formulario non riguarda questa società");
    if (!niyol && c.segno === "SCARICO" && !c.cantiere_verificato) {
      throw new Error("Luogo di produzione non verificabile: conferma non disponibile");
    }
    return c;
  };

  const prepara = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setCandidato(null); setMotivo(""); setOpen(true);
    try {
      const c = await leggi();
      const stato = (await leggiStato([c.numero_fir])).get(normFir(c.numero_fir));
      if (stato?.registrato) setMotivo("Registrato");
      else if (!c.idoneo) setMotivo(c.motivo);
      else setCandidato(c);
    } catch (e) { setMotivo(e instanceof Error ? e.message : String(e)); }
    finally { lock.current = false; setBusy(false); }
  };

  const conferma = async () => {
    if (lock.current || !candidato) return;
    lock.current = true; setBusy(true);
    try {
      // Reread before writing, never trust an old preview or the local draft.
      const fresco = await leggi();
      if (JSON.stringify(fresco) !== JSON.stringify(candidato)) {
        setCandidato(null); setMotivo("I dati RENTRI sono cambiati. Chiudi e ricontrolla il formulario.");
        return;
      }
      const stato = (await leggiStato([fresco.numero_fir])).get(normFir(fresco.numero_fir));
      const esito = niyol
        ? await registraFirInRegistroNiyol(fresco, stato)
        : await registraFirInGiacenze(fresco, stato);
      toast.success(esito === "gia_registrato" ? "Registrato" : "Formulario confermato");
      await queryClient.invalidateQueries();
      setOpen(false); setCandidato(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { lock.current = false; setBusy(false); }
  };

  if (!supportato || cartaceo) return null;
  return <>
    <Button disabled={!numeroFir || busy} onClick={() => void prepara()} className="gap-2 whitespace-normal h-auto min-h-10">
      {busy ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
      {niyol ? "Conferma nel registro Niyol" : "Conferma registro e giacenze"}
    </Button>
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Conferma formulario</DialogTitle></DialogHeader>
        <p className="font-mono text-sm">{numeroFir}</p>
        {busy && !candidato && <Loader2 className="h-5 w-5 animate-spin" aria-label="Controllo RENTRI" />}
        {motivo && <p role="status" className="text-sm text-muted-foreground">{motivo}</p>}
        {candidato && <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt>Movimento</dt><dd>{candidato.segno === "CARICO" ? "Carico" : "Scarico"}</dd>
          <dt>Data arrivo</dt><dd>{candidato.data_arrivo.split("-").reverse().join("/")}</dd>
          <dt>CER</dt><dd>{candidato.cer}</dd>
          <dt>Kg accettati</dt><dd>{candidato.kg_accettati.toLocaleString("it-IT", { maximumFractionDigits: 3 })}</dd>
        </dl>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Chiudi</Button>
          {candidato && <Button disabled={busy} onClick={() => void conferma()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {niyol || candidato.cantiere_diverso ? "Conferma nel registro" : "Conferma e aggiorna giacenze"}
          </Button>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}