import { Fragment, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dettaglioFormularioRentri, type RentriCliente } from "@/lib/rentriVpsApi";

type Raw = Record<string, any>;
const v = (x: unknown) => (x === null || x === undefined || x === "" ? "—" : String(x));
const data = (x: unknown) => {
  const s = String(x ?? "");
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", ...(s.length > 10 ? { timeStyle: "short" } : {}) });
};
const qta = (q: any, um?: string) => {
  if (q === null || q === undefined || q === "") return "—";
  if (typeof q === "object") return `${Number(q.valore ?? 0).toLocaleString("it-IT")} ${q.unita_misura ?? um ?? ""}`;
  return `${Number(q).toLocaleString("it-IT")} ${um ?? "kg"}`;
};
const luogo = (l: any) => {
  if (!l) return "—";
  return [l.indirizzo, l.civico, l.cap, l.citta?.nome_comune ?? l.citta?.comune_id, l.citta?.provincia].filter(Boolean).join(" ") || "—";
};
const soggetto = (s: any) => s ? `${v(s.denominazione)} (CF ${v(s.codice_fiscale)})` : "—";

function Sezione({ titolo, righe }: { titolo: string; righe: [string, string][] }) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">{titolo}</p>
      <dl className="grid grid-cols-[minmax(130px,auto)_1fr] gap-x-3 gap-y-1 text-sm">
        {righe.map(([k, val]) => (<Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd className="break-words">{val}</dd></Fragment>))}
      </dl>
    </div>
  );
}

/** Lettura completa del formulario: dati riletti dal RENTRI (sola lettura) e, in mancanza, i dati salvati. */
export function FirDettaglioLettura({ numeroFir, cliente, form }: { numeroFir?: string | null; cliente: RentriCliente; form: Raw }) {
  const [det, setDet] = useState<Raw | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cartaceo = form?.form_data?.formato_fir === "cartaceo";

  const leggi = async () => {
    if (!numeroFir || cartaceo) return;
    setLoading(true); setErrore(null);
    try {
      const r = await dettaglioFormularioRentri(cliente, numeroFir);
      if (!r.success || !r.data || typeof r.data !== "object") throw new Error(r.userMessage || r.error || "Formulario non trovato sul RENTRI");
      setDet(r.data as Raw);
    } catch (e: any) { setErrore(e.message); setDet(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { void leggi(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [numeroFir, cliente]);

  const fd = form?.form_data ?? {};
  const locale: [string, string][] = [
    ["Produttore", v(form?.produttore_denominazione ?? fd.produttore_denominazione)],
    ["Luogo produzione", v(fd.cantiereIndirizzo ?? fd.produttore_luogo_produzione)],
    ["Trasportatore", v(form?.trasportatore_denominazione ?? fd.trasportatore_denominazione)],
    ["Destinatario", v(form?.destinatario_denominazione ?? fd.destinatario_denominazione)],
    ["CER", v(form?.codice_eer ?? fd.codice_eer)],
    ["Descrizione", v(form?.descrizione_rifiuto ?? fd.descrizione_rifiuto)],
    ["Quantità partenza", v(form?.quantita ?? fd.quantita)],
    ["Kg accettati a destino", v(fd.quantita_destino ?? fd.quantita_accettata ?? fd.peso_destino)],
    ["Data emissione", data(fd.data_emissione)],
  ];

  const p = det?.dati_partenza ?? det ?? {};
  const prod = p.produttore ?? {};
  const trsp = (Array.isArray(p.trasportatori) ? p.trasportatori[0] : p.trasportatore) ?? {};
  const dest = p.destinatario ?? (Array.isArray(p.destinatari) ? p.destinatari[0] : null) ?? {};
  const rif = p.rifiuto ?? {};
  const acc = det?.dati_accettazione ?? det?.accettazione ?? null;

  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Lettura del formulario {numeroFir || ""}</p>
        {!cartaceo && numeroFir && (
          <Button size="sm" variant="outline" onClick={() => void leggi()} disabled={loading} className="gap-1">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Rileggi dal RENTRI
          </Button>
        )}
      </div>
      {loading && <p className="text-xs text-muted-foreground">Lettura dal RENTRI in corso…</p>}
      {errore && <p className="text-xs text-muted-foreground">{/non trovat/i.test(errore) ? "Questo formulario non risulta sul RENTRI (cartaceo o non ancora emesso)." : `RENTRI non leggibile ora: ${errore}`} Qui sotto i dati salvati nel programma.</p>}
      {det ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Sezione titolo="Dati generali (RENTRI)" righe={[
            ["Numero FIR", v(det.numero_fir ?? numeroFir)], ["Stato", v(det.stato)],
            ["Data emissione", data(p.data_emissione ?? det.data_emissione)], ["Inizio trasporto", data(det.dati_trasporto?.data_ora_inizio_trasporto ?? p.data_ora_inizio_trasporto)],
          ]} />
          <Sezione titolo="Produttore / detentore" righe={[["Soggetto", soggetto(prod)], ["Unità locale", v(prod.num_iscr_sito)], ["Luogo produzione", luogo(prod.luogo_produzione)]]} />
          <Sezione titolo="Trasportatore" righe={[["Soggetto", soggetto(trsp)], ["Iscrizione albo", v(trsp.numero_iscrizione_albo)], ["Targa", v(trsp.targa_automezzo ?? det.dati_trasporto?.targa_automezzo)], ["Conducente", v([det.dati_trasporto?.nome_conducente, det.dati_trasporto?.cognome_conducente].filter(Boolean).join(" ") || null)]]} />
          <Sezione titolo="Destinatario" righe={[["Soggetto", soggetto(dest)], ["Unità locale", v(dest.num_iscr_sito)], ["Operazione", v(dest.attivita ?? dest.codice_operazione)]]} />
          <Sezione titolo="Rifiuto" righe={[["CER", v(rif.codice_eer ?? det.codice_eer)], ["Descrizione", v(rif.descrizione)], ["Stato fisico", v(rif.stato_fisico)], ["Quantità partenza", qta(rif.quantita ?? det.quantita, det.unita_misura)], ["Caratteristiche HP", v(Array.isArray(rif.caratteristiche_pericolo) ? rif.caratteristiche_pericolo.join(", ") : null)]]} />
          <Sezione titolo="Accettazione a destino" righe={acc ? [
            ["Arrivo", data(acc.data_ora_arrivo)], ["Esito", v(acc.accettazione ?? acc.esito)],
            ["Kg accettati", qta(acc.quantita_accettata, det.unita_misura)], ["Motivo respingimento", v(acc.causale_respingimento ?? acc.motivo)],
          ] : [["Stato", "Non ancora accettato"]]} />
        </div>
      ) : (
        <Sezione titolo={cartaceo ? "Formulario cartaceo (dati salvati)" : "Dati salvati nel programma"} righe={locale} />
      )}
    </div>
  );
}
