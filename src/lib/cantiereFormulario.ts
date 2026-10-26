/**
 * Cantiere dichiarato su un formulario compilato nel programma (cartaceo o digitale).
 * REGOLA: se Multy è produttore e il luogo di produzione non è l'impianto di Piscina
 * (Via Rivarossa), le giacenze NON cambiano: solo registro.
 */
const s = (v: unknown) => String(v ?? "").trim();

export function cantiereDaFormulario(fd: Record<string, any>): { diverso: boolean; descrizione: string } {
  const via = s(fd.cantiereIndirizzo) || s(fd.produttoreLuogoProduzioneDiverso) || s(fd.produttore_luogo_produzione)
    || s(fd.prod_luogo_produzione) || s(fd.luogo_produzione) || s(fd.cantiere_indirizzo);
  const comune = s(fd.cantiereComune) || s(fd.cantiere_comune);
  const descrizione = [via, comune].filter(Boolean).join(" ").trim();
  if (!descrizione) return { diverso: false, descrizione: "" };
  const testo = descrizione.toLowerCase();
  const piscina = /rivarossa/.test(testo) && (!comune || /piscina/i.test(comune) || /piscina/.test(testo));
  return { diverso: !piscina, descrizione };
}
