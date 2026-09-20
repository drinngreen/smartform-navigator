export const GIACENZE_SNAPSHOT_18_DATE = "2026-09-18";

// La fotografia allegata del 18/09 include già entrambe le cernite registrate
// alle 17:01 italiane. Si applicano soltanto movimenti registrati dopo di esse.
export const GIACENZE_SNAPSHOT_18_CUTOFF = "2026-09-18T15:01:39.000Z";

export interface GiacenzaSnapshotRow {
  carico: number;
  scarico: number;
  saldo: number;
}

// Fotografia certificata dalla stampa allegata
// "Registro_CER_al_18-09-2026_3-2.pdf", confermata identica dalla stampa
// "Registro_CER_al_19-09-2026.pdf". Include le due cernite del 18/09.
// È una base di sola lettura: non viene mai scritta in magazzino_giacenze.
export const GIACENZE_SNAPSHOT_18_MATTINA: Record<string, GiacenzaSnapshotRow> = {
  "010408": { carico: 0, scarico: 0, saldo: 0 },
  "030105": { carico: 980, scarico: 0, saldo: 980 },
  "070213": { carico: 0, scarico: 0, saldo: 0 },
  "080111": { carico: 31, scarico: 0, saldo: 31 },
  "080112": { carico: 270, scarico: 0, saldo: 270 },
  "080312": { carico: 0, scarico: 0, saldo: 0 },
  "080318": { carico: 325, scarico: 0, saldo: 325 },
  "090105": { carico: 0, scarico: 0, saldo: 0 },
  "100210": { carico: 0, scarico: 0, saldo: 0 },
  "120101": { carico: 16400, scarico: 0, saldo: 16400 },
  "120102": { carico: 52438, scarico: 21400, saldo: 31038 },
  "120103": { carico: 190, scarico: 0, saldo: 190 },
  "120104": { carico: 0, scarico: 0, saldo: 0 },
  "120105": { carico: 0, scarico: 0, saldo: 0 },
  "120107": { carico: 0, scarico: 0, saldo: 0 },
  "120109": { carico: 2626, scarico: 0, saldo: 2626 },
  "120117": { carico: 5200, scarico: 0, saldo: 5200 },
  "120121": { carico: 0, scarico: 0, saldo: 0 },
  "120301": { carico: 0, scarico: 0, saldo: 0 },
  "130110": { carico: 0, scarico: 0, saldo: 0 },
  "130205": { carico: 3980, scarico: 0, saldo: 3980 },
  "150101": { carico: 28860, scarico: 26600, saldo: 2260 },
  "150102": { carico: 21980, scarico: 0, saldo: 21980 },
  "150103": { carico: 14443, scarico: 4940, saldo: 9503 },
  "150104": { carico: 0, scarico: 0, saldo: 0 },
  "150106": { carico: 36157, scarico: 22380, saldo: 13777 },
  "150107": { carico: 300, scarico: 0, saldo: 300 },
  "150110": { carico: 3640, scarico: 3000, saldo: 640 },
  "150202": { carico: 4860, scarico: 0, saldo: 4860 },
  "150203": { carico: 1000, scarico: 0, saldo: 1000 },
  "160103": { carico: 498, scarico: 0, saldo: 498 },
  "160117": { carico: 0, scarico: 0, saldo: 0 },
  "160119": { carico: 2500, scarico: 0, saldo: 2500 },
  "160120": { carico: 1024, scarico: 0, saldo: 1024 },
  "160122": { carico: 14, scarico: 0, saldo: 14 },
  "160213": { carico: 0, scarico: 0, saldo: 0 },
  "160214": { carico: 34955, scarico: 29240, saldo: 5715 },
  "160216": { carico: 3005, scarico: 0, saldo: 3005 },
  "160504": { carico: 3, scarico: 0, saldo: 3 },
  "160505": { carico: 160, scarico: 0, saldo: 160 },
  "160601": { carico: 17184, scarico: 16000, saldo: 1184 },
  "160604": { carico: 48, scarico: 0, saldo: 48 },
  "160605": { carico: 36, scarico: 0, saldo: 36 },
  "170102": { carico: 0, scarico: 0, saldo: 0 },
  "170107": { carico: 12000, scarico: 12000, saldo: 0 },
  "170201": { carico: 3500, scarico: 1260, saldo: 2240 },
  "170202": { carico: 4515, scarico: 0, saldo: 4515 },
  "170203": { carico: 1180, scarico: 0, saldo: 1180 },
  "170302": { carico: 0, scarico: 0, saldo: 0 },
  "170401": { carico: 8215, scarico: 0, saldo: 8215 },
  "170402": { carico: 1906, scarico: 0, saldo: 1906 },
  "170403": { carico: 0, scarico: 0, saldo: 0 },
  "170405": { carico: 105015, scarico: 65340, saldo: 39675 },
  "170407": { carico: 16185.5, scarico: 9300, saldo: 6885.5 },
  "170411": { carico: 3833, scarico: 0, saldo: 3833 },
  "170603": { carico: 0, scarico: 0, saldo: 0 },
  "170604": { carico: 0, scarico: 0, saldo: 0 },
  "170802": { carico: 1070, scarico: 0, saldo: 1070 },
  "170904": { carico: 30960, scarico: 20300, saldo: 10660 },
  "191202": { carico: 1800, scarico: 1800, saldo: 0 },
  "191203": { carico: 0, scarico: 0, saldo: 0 },
  "191204": { carico: 173, scarico: 173, saldo: 0 },
  "191207": { carico: 0, scarico: 0, saldo: 0 },
  "191212": { carico: 17915, scarico: 0, saldo: 17915 },
  "200101": { carico: 0, scarico: 0, saldo: 0 },
  "200140": { carico: 30707.2, scarico: 15443.2, saldo: 15264 },
  "200140-CAVO": { carico: 18312, scarico: 16744, saldo: 1568 },
  "200140-FE": { carico: 157179, scarico: 134498.5, saldo: 22680.5 },
  "200140-MIX": { carico: 37298, scarico: 35584, saldo: 1714 },
  "200140-OT": { carico: 8544, scarico: 4848, saldo: 3696 },
  "200140-PI": { carico: 2912, scarico: 2203, saldo: 709 },
  "200140-RA": { carico: 21055.34, scarico: 18621.17, saldo: 2434.17 },
  "200307": { carico: 831, scarico: 0, saldo: 831 },
  "MAT-INER01": { carico: 1500, scarico: 1500, saldo: 0 },
  "MPS-FE01": { carico: 800, scarico: 800, saldo: 0 },
};

export interface MovimentoRealePostSnapshot {
  cer: string;
  tipo_movimento: string;
  quantita_kg: number;
  created_at: string;
}

export const applicaMovimentiRealiPostSnapshot = (
  snapshot: Record<string, GiacenzaSnapshotRow>,
  movimenti: MovimentoRealePostSnapshot[],
  finoA: string,
): Record<string, GiacenzaSnapshotRow> => {
  const result = Object.fromEntries(
    Object.entries(snapshot).map(([cer, row]) => [cer, { ...row }]),
  );
  const fineGiornata = `${finoA}T23:59:59.999+02:00`;

  for (const movimento of movimenti) {
    if (movimento.created_at < GIACENZE_SNAPSHOT_18_CUTOFF || movimento.created_at > fineGiornata) continue;
    const cer = movimento.cer.toUpperCase().trim().replace(/\s+/g, "");
    const row = result[cer] ?? { carico: 0, scarico: 0, saldo: 0 };
    const quantita = Number(movimento.quantita_kg) || 0;
    if (movimento.tipo_movimento === "CARICO") row.carico += quantita;
    if (movimento.tipo_movimento === "SCARICO") row.scarico += quantita;
    row.saldo = row.carico - row.scarico;
    result[cer] = row;
  }

  // Il saldo non è mai un valore indipendente: deve sempre derivare dai due
  // totali esposti, così tabella, PDF ed Excel tornano riga per riga.
  for (const row of Object.values(result)) {
    row.saldo = row.carico - row.scarico;
  }

  return result;
};