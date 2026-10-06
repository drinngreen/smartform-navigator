/**
 * Calcolo giacenze a cascata dal 22/09/2026.
 * Saldo di un giorno = fotografia fissa del 21/09 + somma di tutte le operazioni
 * umane (registro con incide_giacenze=true e cernite confermate) dal 22/09 a quel giorno.
 * Funzioni pure: nessuna scrittura.
 */
export const GIACENZE_FINAL_DATE = "2026-09-21";

export type MovimentoGiacenza = { data: string; cer: string; carico: number; scarico: number };
export type SaldoBase = { cer: string; saldo: number };

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Saldo per CER al giorno indicato (incluso). Prima o al 21/09 vale solo la base. */
export function saldiAlGiorno(base: SaldoBase[], movimenti: MovimentoGiacenza[], data: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const b of base) out.set(b.cer, (out.get(b.cer) ?? 0) + b.saldo);
  if (data <= GIACENZE_FINAL_DATE) return out;
  for (const m of movimenti) {
    if (m.data <= GIACENZE_FINAL_DATE || m.data > data) continue;
    out.set(m.cer, r3((out.get(m.cer) ?? 0) + m.carico - m.scarico));
  }
  return out;
}

export type EsitoVerifica = { ok: true } | { ok: false; errore: string };

/**
 * Verifica che aggiungere i nuovi movimenti non porti mai nessun CER sotto zero
 * in nessun giorno dalla data del primo nuovo movimento in poi, e che nessuno sia ≤ 21/09.
 */
export function verificaNuoviMovimenti(base: SaldoBase[], esistenti: MovimentoGiacenza[], nuovi: MovimentoGiacenza[]): EsitoVerifica {
  for (const n of nuovi) {
    if (!n.data || n.data <= GIACENZE_FINAL_DATE) return { ok: false, errore: "Vietato: le giacenze fino al 21/09/2026 sono immutabili" };
    if (!(n.carico >= 0 && n.scarico >= 0) || n.carico + n.scarico <= 0) return { ok: false, errore: "Quantità non valida" };
  }
  const tutti = [...esistenti, ...nuovi];
  const cers = new Set(nuovi.map((n) => n.cer));
  const primo = nuovi.map((n) => n.data).sort()[0];
  const date = Array.from(new Set(tutti.map((m) => m.data).filter((d) => d >= primo))).sort();
  for (const d of date) {
    const s = saldiAlGiorno(base, tutti, d);
    for (const cer of cers) {
      const v = s.get(cer) ?? 0;
      if (v < -0.0005) {
        return { ok: false, errore: `CER ${cer} andrebbe a ${v.toLocaleString("it-IT")} kg il ${d.split("-").reverse().join("/")}: operazione rifiutata` };
      }
    }
  }
  return { ok: true };
}
