# Referto di certificazione RENTRI — 16 settembre 2026, ore 09:10

Ogni voce riporta la prova a cui si riferisce. Nessuna garanzia senza prova.

## Prove superate

| # | Voce | Esito | Prova |
|---|------|-------|-------|
| 1 | Un payload FIR completo e conforme passa la validazione pre-invio | OK | `src/__tests__/regression/rentriCertificazione.test.ts` → "accetta un payload completo e conforme" |
| 2 | I codici fiscali reali di Multy, Niyol e Global superano il checksum ufficiale | OK | stessa suite → "accetta i codici fiscali reali" |
| 3 | Il numero FIR viene normalizzato a 6 cifre (ZRZXR742 → ZRZXR000742) | OK | stessa suite → "normalizza il numero FIR a 6 cifre" |
| 4 | Payload non conformi (senza FIR, CER errato, quantità nulla, senza trasportatore, CF errato, senza targa) vengono bloccati PRIMA dell'invio | OK | stessa suite → "blocca i payload non conformi" |
| 5 | Gli alias liberi diventano codici ufficiali (stato fisico, provenienza, formato italiano "1.200,5") senza toccare l'originale | OK | stessa suite → "normalizza alias liberi" |
| 6 | I movimenti a registro escludono righe senza CER o con quantità non positiva e usano la sede ufficiale di ciascuna azienda | OK | stessa suite → "movimenti a registro" (2 prove) |
| 7 | Multy e Niyol hanno issuer e registri configurati e separati | OK | stessa suite → "configurazione e transazioni" |
| 8 | L'identificativo di transazione viene letto comunque arrivi dal RENTRI | OK | stessa suite → "id transazione annidato" |
| 9 | Ponte RENTRI configurato per Multy: sede, issuer, registro e chiave del bridge presenti | OK | risposta dry-run ore 09:08, `sent_to_bridge:false`, `errori:[]` |
| 10 | Ponte RENTRI configurato per Niyol: stesse verifiche | OK | risposta dry-run ore 09:08, `errori:[]` |
| 11 | RENTRI risponde davvero per Multy: elenco blocchi reale ricevuto (FRVKM 1.375 FIR, ZRZXR 797 FIR) | OK | chiamata in sola lettura ore 09:09, `success:true status:200`, risposta integrale in console |
| 12 | RENTRI risponde davvero per Niyol: elenco blocchi reale ricevuto (DGXYQ, BPJMG 488 FIR, ultimo uso oggi 08:14 italiane) | OK | chiamata in sola lettura ore 09:09, `success:true status:200` |
| 13 | Typecheck e 65 prove automatiche superate | OK | `node scripts/verify.mjs` ore 09:08: "Verifica superata" |

## Difetti trovati e corretti durante la certificazione

- Le quantità scritte all'italiana ("1.200,5") non venivano convertite: corretto in `src/lib/rentriValidazione.ts` (prova 5).

## Saldi prima/dopo (nessuna alterazione)

| Misura | Prima (09:05) | Dopo (09:10) |
|---|---|---|
| Giacenze magazzino | 73 righe, 276.538,170 kg, 0 negative | invariato |
| Movimenti impianto | 932 | 932 |
| Cernite / output cernite | 0 / 0 | 0 / 0 |
| Righe Dragon nascoste | 17 | 17 |
| Invii registro archiviati | 0 | 0 |
| Diario operazioni RENTRI | 1.344 | 1.347 (+3 sole righe di registro delle chiamate di lettura) |

## Cosa resta NON certificato

- **Invio reale**: un formulario e un movimento a registro accettati dal RENTRI con ricevuta.
  Serve il tuo via libera: propongo 1 formulario reale Multy scelto da te, poi 1 Niyol.
- 69 segnalazioni di sicurezza aperte sul database.
- I punti di scrittura database multipli (cernite, conferma cartacea, privati) restano separati:
  le regole ci sono, ma l'unificazione tecnica è ancora da fare.
