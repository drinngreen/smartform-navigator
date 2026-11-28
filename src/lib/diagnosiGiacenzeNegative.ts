/**
 * Diagnosi giacenze negative (sola lettura, nessuna scrittura).
 * Per ogni CER sotto zero spiega PERCHÉ (quali scarichi lo hanno portato sotto)
 * e propone la soluzione: i formulari di carico già accettati sul RENTRI ma
 * non ancora confermati. La conferma resta sempre un'operazione umana.
 */
import { saldiAlGiorno, GIACENZE_FINAL_DATE, type MovimentoGiacenza, type SaldoBase } from "@/lib/giacenzeCascata";
import type { FirGiacenzaCandidato } from "@/lib/rentriFirGiacenze";

export type MovimentoConRif = MovimentoGiacenza & { rif?: string };

export type DiagnosiCer = {
  cer: string;
  saldo: number;
  base: number;
  carichi: number;
  scarichi: number;
  /** Kg che servono per tornare a zero. */
  mancano: number;
  /** Giorno in cui il CER è sceso (l'ultima volta) sotto zero. */
  dataNegativo: string;
  /** Scarichi da quel giorno in poi: sono loro ad aver svuotato il CER. */
  scarichiCausa: MovimentoConRif[];
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;
export const fmtKgIt = (n: number) => n.toLocaleString("it-IT", { maximumFractionDigits: 2 });
export const fmtDataIt = (d: string) => (d ? d.split("-").reverse().join("/") : "—");

export function diagnosiNegativi(base: SaldoBase[], movimenti: MovimentoConRif[], oggi: string): DiagnosiCer[] {
  const finale = saldiAlGiorno(base, movimenti, oggi);
  const out: DiagnosiCer[] = [];
  for (const [cer, saldo] of finale) {
    if (!(saldo < -0.0005)) continue;
    const mov = movimenti
      .filter((m) => m.cer === cer && m.data > GIACENZE_FINAL_DATE && m.data <= oggi)
      .sort((a, b) => a.data.localeCompare(b.data));
    const b = base.filter((x) => x.cer === cer).reduce((a, x) => a + x.saldo, 0);
    let s = b;
    let dataNegativo = "";
    for (const d of Array.from(new Set(mov.map((m) => m.data)))) {
      const prima = s;
      for (const m of mov.filter((x) => x.data === d)) s = r3(s + m.carico - m.scarico);
      if (s < -0.0005 && !(prima < -0.0005)) dataNegativo = d;
      if (!(s < -0.0005)) dataNegativo = "";
    }
    out.push({
      cer,
      saldo,
      base: b,
      carichi: r3(mov.reduce((a, m) => a + m.carico, 0)),
      scarichi: r3(mov.reduce((a, m) => a + m.scarico, 0)),
      mancano: r3(-saldo),
      dataNegativo,
      scarichiCausa: mov.filter((m) => m.scarico > 0 && (!dataNegativo || m.data >= dataNegativo)),
    });
  }
  return out.sort((a, b) => a.saldo - b.saldo);
}

export type SoluzioneCer = {
  cer: string;
  /** Carichi accettati sul RENTRI, non ancora confermati: si possono confermare subito. */
  pronti: FirGiacenzaCandidato[];
  kgPronti: number;
  /** Carichi non ancora accettati dal destinatario: si confermano dopo l'accettazione. */
  inArrivo: FirGiacenzaCandidato[];
  /** Saldo dopo aver confermato tutti i carichi pronti. */
  saldoDopo: number;
  risolvibile: boolean;
  motivo: string;
};

/** Abbina a ogni CER negativo i formulari di carico in sospeso (già esclusi quelli registrati). */
export function proponiSoluzione(d: DiagnosiCer, carichiInSospeso: FirGiacenzaCandidato[]): SoluzioneCer {
  const delCer = carichiInSospeso.filter((c) => c.segno === "CARICO" && c.cer === d.cer);
  const pronti = delCer.filter((c) => c.idoneo && c.kg_accettati > 0);
  const inArrivo = delCer.filter((c) => !c.idoneo && /non ancora accettato/i.test(c.motivo));
  const kgPronti = r3(pronti.reduce((a, c) => a + c.kg_accettati, 0));
  const saldoDopo = r3(d.saldo + kgPronti);
  const risolvibile = saldoDopo > -0.0005;
  const causa = d.dataNegativo
    ? `Il CER ${d.cer} è sceso sotto zero il ${fmtDataIt(d.dataNegativo)}: dal 22/09 sono usciti ${fmtKgIt(d.scarichi)} kg ma ne risultano entrati solo ${fmtKgIt(d.carichi)} kg (giacenza al 21/09: ${fmtKgIt(d.base)} kg).`
    : `Il CER ${d.cer} è sotto zero: usciti ${fmtKgIt(d.scarichi)} kg, entrati ${fmtKgIt(d.carichi)} kg (giacenza al 21/09: ${fmtKgIt(d.base)} kg).`;
  let rimedio: string;
  if (risolvibile && pronti.length) {
    rimedio = `Motivo: ${pronti.length === 1 ? "c'è 1 formulario di carico già accettato" : `ci sono ${pronti.length} formulari di carico già accettati`} sul RENTRI ma non ancora confermat${pronti.length === 1 ? "o" : "i"} (${fmtKgIt(kgPronti)} kg). Confermandoli il CER torna a ${fmtKgIt(saldoDopo)} kg.`;
  } else if (pronti.length) {
    rimedio = `Ci sono ${pronti.length} formulari di carico da confermare (${fmtKgIt(kgPronti)} kg), ma non bastano: dopo la conferma mancheranno ancora ${fmtKgIt(-saldoDopo)} kg.`;
  } else if (inArrivo.length) {
    rimedio = `Motivo: ${inArrivo.length} formulari di carico (${fmtKgIt(inArrivo.reduce((a, c) => a + c.kg_accettati, 0) || 0)} kg accettati finora) non sono ancora stati accettati dal destinatario sul RENTRI: vanno chiusi sul RENTRI e poi confermati qui.`;
  } else {
    rimedio = "Motivo: sul RENTRI non c'è nessun formulario di carico di questo CER da confermare. Il materiale uscito non risulta mai entrato: manca un carico di lavorazione o una cernita, oppure uno scarico è stato registrato con il CER sbagliato.";
  }
  if (!risolvibile && pronti.length === 0 && inArrivo.length) {
    rimedio += ` Anche dopo, se non bastano, manca un carico di lavorazione o una cernita.`;
  }
  return { cer: d.cer, pronti, kgPronti, inArrivo, saldoDopo, risolvibile, motivo: `${causa} ${rimedio}` };
}
