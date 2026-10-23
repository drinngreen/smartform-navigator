/**
 * Kg da fatturare per un formulario: SEMPRE quelli confermati a destino
 * (accettati dall'impianto), mai il peso di partenza.
 * Restituisce null se il destino non ha ancora confermato il peso.
 */
export function kgDestinoFir(fir: any, pesoRegistro?: number | null): number | null {
  const fd = fir?.form_data || {};
  const candidati = [
    fd.quantita_accettata,
    fd.peso_ricevuto,
    fd.quantita_destino,
    fd.peso_destino,
    pesoRegistro,
  ];
  for (const c of candidati) {
    const n = Number(String(c ?? "").replace(",", "."));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}
