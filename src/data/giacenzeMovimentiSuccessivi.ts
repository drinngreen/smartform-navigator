// Movimenti umani registrati dopo l'ultima giornata fissa (21/09/2026).
// Si sommano alle giacenze dal giorno indicato in poi. Ogni voce = un'operazione
// ordinata esplicitamente dall'utente e presente nel registro Multy Impianto.
export type MovimentoSuccessivo = { data: string; cer: string; carico: number; scarico: number; nota: string };

export const GIACENZE_MOVIMENTI_SUCCESSIVI: MovimentoSuccessivo[] = [
  { data: "2026-09-23", cer: "170411", carico: 1300, scarico: 0, nota: "Carico di lavorazione" },
  { data: "2026-09-23", cer: "170407", carico: 12400, scarico: 0, nota: "Carico di lavorazione" },
  { data: "2026-09-23", cer: "170405", carico: 41800, scarico: 0, nota: "Carico di lavorazione" },
];
