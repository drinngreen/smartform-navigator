/** Codici di Recupero (R) e Smaltimento (D) — Allegato B/C D.Lgs. 152/2006 */
export const CODICI_RECUPERO = [
    { codice: "R01", tipo: "R", descrizione: "Utilizzazione principale come combustibile o come altro mezzo per produrre energia" },
    { codice: "R02", tipo: "R", descrizione: "Rigenerazione/recupero di solventi" },
    { codice: "R03", tipo: "R", descrizione: "Riciclo/recupero delle sostanze organiche non utilizzate come solventi (comprese le operazioni di compostaggio e altre trasformazioni biologiche)" },
    { codice: "R04", tipo: "R", descrizione: "Riciclo/recupero dei metalli e dei composti metallici" },
    { codice: "R05", tipo: "R", descrizione: "Riciclo/recupero di altre sostanze inorganiche" },
    { codice: "R06", tipo: "R", descrizione: "Rigenerazione degli acidi e delle basi" },
    { codice: "R07", tipo: "R", descrizione: "Recupero dei prodotti che servono a captare gli inquinanti" },
    { codice: "R08", tipo: "R", descrizione: "Recupero dei prodotti provenienti dai catalizzatori" },
    { codice: "R09", tipo: "R", descrizione: "Rigenerazione o altri reimpieghi degli oli" },
    { codice: "R10", tipo: "R", descrizione: "Spandimento sul suolo a beneficio dell'agricoltura o dell'ecologia" },
    { codice: "R11", tipo: "R", descrizione: "Utilizzazione dei rifiuti ottenuti da una delle operazioni indicate da R1 a R10" },
    { codice: "R12", tipo: "R", descrizione: "Scambio di rifiuti per sottoporli a una delle operazioni indicate da R1 a R11" },
    { codice: "R13", tipo: "R", descrizione: "Messa in riserva di rifiuti per sottoporli a una delle operazioni indicate nei punti da R1 a R12 (escluso il deposito temporaneo, prima della raccolta, nel luogo in cui sono prodotti)" },
];
export const CODICI_SMALTIMENTO = [
    { codice: "D01", tipo: "D", descrizione: "Deposito sul o nel suolo (a esempio discarica)" },
    { codice: "D02", tipo: "D", descrizione: "Trattamento in ambiente terrestre (a esempio biodegradazione di rifiuti liquidi o fanghi nei suoli)" },
    { codice: "D03", tipo: "D", descrizione: "Iniezioni in profondità (a esempio iniezioni di rifiuti pompabili in pozzi, in cupole saline o faglie geologiche naturali)" },
    { codice: "D04", tipo: "D", descrizione: "Lagunaggio (a esempio scarico di rifiuti liquidi o di fanghi in pozzi, stagni o lagune, ecc.)" },
    { codice: "D05", tipo: "D", descrizione: "Messa in discarica specialmente allestita (a esempio sistematizzazione in alveoli stagni separati, ricoperti o isolati gli uni dagli altri e dall'ambiente)" },
    { codice: "D06", tipo: "D", descrizione: "Scarico dei rifiuti solidi nell'ambiente idrico eccetto l'immersione" },
    { codice: "D07", tipo: "D", descrizione: "Immersione, compreso il seppellimento nel sottosuolo marino" },
    { codice: "D08", tipo: "D", descrizione: "Trattamento biologico non specificato altrove nel presente allegato, che dia origine a composti o a miscugli che vengono eliminati secondo uno dei procedimenti elencati nei punti da D1 a D12" },
    { codice: "D09", tipo: "D", descrizione: "Trattamento fisico-chimico non specificato altrove nel presente allegato, che dia origine a composti o a miscugli che vengono eliminati secondo uno dei procedimenti elencati nei punti da D1 a D12 (a esempio evaporazione, essiccazione, calcinazione, ecc.)" },
    { codice: "D10", tipo: "D", descrizione: "Incenerimento a terra" },
    { codice: "D11", tipo: "D", descrizione: "Incenerimento in mare" },
    { codice: "D12", tipo: "D", descrizione: "Deposito permanente (a esempio sistemazione di contenitori in una miniera, ecc.)" },
    { codice: "D13", tipo: "D", descrizione: "Raggruppamento preliminare prima di una delle operazioni di cui ai punti da D1 a D12" },
    { codice: "D14", tipo: "D", descrizione: "Ricondizionamento preliminare prima di una delle operazioni di cui ai punti da D1 a D13" },
    { codice: "D15", tipo: "D", descrizione: "Deposito preliminare prima di una delle operazioni di cui ai punti da D1 a D14 (escluso il deposito temporaneo, prima della raccolta, nel luogo in cui sono prodotti)" },
];
export const TUTTI_CODICI_OPERAZIONE = [...CODICI_RECUPERO, ...CODICI_SMALTIMENTO];
/** Cerca un codice per stringa (es. "R05" o "D13") */
export function getCodiceOperazione(codice) {
    return TUTTI_CODICI_OPERAZIONE.find((c) => c.codice === codice);
}
/** Restituisce la label breve per i select: "R05 - Riciclo/recupero di altre sostanze inorganiche" */
export function labelCodiceOperazione(codice) {
    const c = getCodiceOperazione(codice);
    return c ? `${c.codice} - ${c.descrizione}` : codice;
}
