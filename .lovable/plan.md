# Giacenze che si aggiornano solo con le operazioni delle persone

## La regola
Giacenza di un giorno X = giacenze fisse del 21/09 + tutte le operazioni fatte da una persona dal 22/09 fino al giorno X compreso.
- Un carico aggiunge i kg dal suo giorno in poi. Uno scarico li toglie dal suo giorno in poi.
- Una cernita toglie il CER di partenza e aggiunge i CER ottenuti, dal suo giorno in poi.
- Niente altro cambia le giacenze: nessun ricalcolo, nessuna sincronizzazione, nessun lavoro notturno, nessuna rettifica.
- Fino al 21/09 compreso non cambia nulla: restano le giornate fisse ricalcolate insieme, a partire dal 18/07.

## Il problema di oggi
La pagina Giacenze non legge il registro. Il carico del 23/09 compare solo perché l'ho scritto io a mano nella pagina. Quindi un'operazione inserita da voi oggi non comparirebbe.

## La soluzione
1. **Un interruttore su ogni riga del registro: "conta nelle giacenze" sì o no.**
   - Le righe che esistono già sono tutte su "no", tranne le tre righe del carico di lavorazione del 23/09 (33024, 33025, 33026), che sono su "sì".
   - Così i formulari che mi avete chiesto di inserire senza toccare le giacenze restano fuori. Questo vale anche per ZRZXR 000838 LB, arrivato il 22/09.
   - Le nuove righe inserite da voi dal programma nascono su "sì".
   - Le righe che inserisco io quando mi dite "senza toccare le giacenze" nascono su "no".
2. **La pagina Giacenze calcola da sola, solo leggendo.** Parte dalle giornate fisse fino al 21/09. Poi somma le righe del registro con "sì" e le cernite completate dopo il 21/09, giorno per giorno fino alla data scelta. Non scrive niente da nessuna parte.
3. **Tolgo la voce fissa del 23/09 dalla pagina**, perché adesso arriva dal registro. Il risultato resta identico al grammo.
4. **Le cernite annullate non contano.** Gli errori si correggono con un movimento inverso, mai cancellando.
5. **Prima di salvare uno scarico o una cernita**, il programma controlla che quel CER non vada sotto zero in nessun giorno successivo. Se andrebbe sotto zero, blocca l'operazione con un messaggio.
6. PDF, Excel e stampa usano lo stesso calcolo della pagina.

## Le prove che ti mostro, prima e dopo
- Il 21/09, il 22/09, il 23/09 e oggi devono risultare identici a ora, CER per CER (276.538,17 kg fino al 22/09, +55.500 kg dal 23/09).
- Una prova automatica confronta ogni CER di ogni giorno con i valori di adesso, prima e dopo la modifica.
- Uno screenshot reale della pagina.
- Le giacenze salvate nel magazzino non vengono toccate.

## Dettagli tecnici
- Migrazione: `registro_generale.incide_giacenze boolean not null default true`. Backfill: tutte le righe esistenti a `false`, tranne i n. 33024-33026 a `true`. Ho letto ora i dati: 5 righe con data dopo il 21/09 e 0 cernite dopo il 22/09. Nessun trigger nuovo.
- `GiacenzeDocumentaliModule`: query in sola lettura su `registro_generale` (tenant Multyproget, registro MULTY_IMPIANTO, `stato_movimento='effettivo'`, `incide_giacenze=true`, `data_movimento > 2026-09-21`). Query sui `dragon_transform_batches`/outputs CONFERMATA dopo il 21/09, con delta su input e output. Viene rimosso `giacenzeMovimentiSuccessivi.ts`.
- Controllo "mai negativi" lato pagina di inserimento e nelle RPC di cernita esistenti, solo come blocco in lettura.
- Test di regressione: snapshot di tutte le giornate dal 18/07 a oggi, uguaglianza esatta.
- `node scripts/verify.mjs --smoke`.
