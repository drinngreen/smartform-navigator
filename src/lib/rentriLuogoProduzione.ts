import { resolveComuneId } from "@/lib/comuneIstat";
import { splitIndirizzoRentri } from "@/lib/rentriFirma";

/** A declared site must never silently become the producer's registered address. */
export async function luogoProduzioneRentri(testo: string, comune = "", provincia = "", cap = "") {
  const raw = testo.trim();
  if (!raw && !comune.trim() && !provincia.trim() && !cap.trim()) return undefined;
  if (!raw) throw new Error("Indirizzo del cantiere mancante: completa il luogo di produzione");
  const indirizzo = splitIndirizzoRentri(raw);
  const comuneId = await resolveComuneId(comune.trim() || raw, cap.trim() || indirizzo.cap, provincia.trim() || undefined);
  if (!comuneId) throw new Error("Comune del cantiere non riconosciuto: completa il luogo di produzione con comune, provincia e CAP");
  return { indirizzo: indirizzo.indirizzo, cap: cap.trim() || indirizzo.cap, citta: { comune_id: comuneId } };
}