# Invii RENTRI dei privati in console + predisposizione invio dalla VPS

Nessuna modifica a giacenze, cernite, registro privati, ricevute privati, movimenti o registri esistenti. Si aggiunge soltanto un archivio nuovo e separato e una schermata nella Console RENTRI.

## 1. Archivio degli invii già fatti da terminale

Nuovo elenco dedicato (tabella nuova, isolata, senza automatismi e senza collegamenti che possano far scattare qualcosa sulle tabelle esistenti) dove finiscono le 359 righe del PDF, ciascuna con:

- numero riga, data, codice CER, kg
- produttore e indirizzo, mezzo
- progressivo RENTRI (es. 2026/1)
- ID transazione
- ID ricevuta RENTRI
- esito testuale riportato nel PDF
- origine: **Eseguito da terminale**

Prima dell'inserimento verifico che le righe estratte dal PDF siano esattamente 359 e che progressivi e ID ricevuta non siano troncati (il PDF manda a capo gli identificativi: la lettura va ricomposta riga per riga e confrontata con il totale dichiarato in testa al documento). L'unica riga senza ricevuta (la 2026/1, ancora non presente nel listato) resta segnata come "non confermata".

L'inserimento avviene solo su questo nuovo elenco: nessun movimento, ricevuta o giacenza viene creato o modificato.

## 2. Nuova scheda "Invii privati" nella Console RENTRI

Nella Console RENTRI si aggiunge una scheda con:

- elenco dal più recente, con data, CER, kg, produttore, mezzo
- progressivo RENTRI, ID transazione, ID ricevuta ben visibili e copiabili
- etichetta di origine: "Eseguito da terminale" (giallo) oppure "Inviato dall'app" (verde)
- stato: confermato / non confermato
- ricerca per nome, CER, progressivo, ricevuta e filtro per mese
- esportazione in Excel e PDF
- riepilogo in alto: totale invii, confermati, non confermati

## 3. Predisposizione per i privati futuri (invio dalla VPS)

Sempre nella stessa scheda, un riquadro in alto **"Privati da inviare al RENTRI"**:

- elenca i conferimenti privati che non risultano ancora in questo archivio, dal più recente
- selezione singola o multipla, con pulsante "Invia al RENTRI"
- l'invio passa dal canale VPS già in uso per i registri (stessa funzione del bridge, registro impianto Multyproget)
- al ritorno la riga viene scritta nell'archivio con origine "Inviato dall'app", progressivo, ID transazione, ID ricevuta ed esito
- pulsante "Verifica" per ricontrollare lo stato di una transazione e aggiornare l'esito

Poiché i privati fino ad agosto sono già stati inviati tutti da terminale, il riquadro risulterà praticamente vuoto: è lì per i movimenti futuri. Le prove reali di invio le facciamo, come chiedi tu, sui movimenti normali dalla scheda "Invio Registri" già esistente, non sui privati.

## Dettagli tecnici

- Migrazione: `public.rentri_invii_privati` (tenant_id, conferimento_id nullable e senza vincolo verso `privati_conferimenti`, data, cer, kg, produttore, indirizzo, mezzo, progressivo_rentri, transazione_id, id_ricevuta, esito, origine `TERMINALE|APP`, stato, created_at). GRANT a `authenticated` e `service_role`, RLS con lettura/scrittura per admin del tenant. Nessun trigger a parte `updated_at`.
- Import delle 359 righe con INSERT dati (non migrazione di schema), chiave univoca su progressivo+transazione per evitare doppioni.
- UI: nuovo componente `src/components/rentri/RentriInviiPrivatiPanel.tsx` + nuova voce in `TABS` di `MNRentriConsolePage.tsx`. Nessuna modifica alle schede esistenti.
- Invio: riuso di `inviaRegistroRentri` / `statoTransazioneRegistro` in `src/lib/rentriVpsApi.ts` e `rentriRegistroSync.ts`, con un mapper dedicato conferimento privato → movimento di carico RENTRI. Nessuna scrittura su `movimenti_impianto` o `magazzino_giacenze`.
- Verifica finale con `node scripts/verify.mjs --smoke` e screenshot della nuova scheda.
