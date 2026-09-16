# Anagrafica automatica + partenza e arrivo entrambi trasmessi a RENTRI

## Obiettivo
1. Chi scrive una nuova azienda o una nuova sede nel formulario la ritrova subito in anagrafica, senza doverla reinserire altrove.
2. Il percorso è esplicito e in due trasmissioni reali al RENTRI: **partenza** e **arrivo**.

## 1. Anagrafica automatica
- Al salvataggio della bozza il sistema confronta produttore, destinatario, trasportatore e intermediario con l'anagrafica.
- Crea il soggetto solo se davvero nuovo; se coincide per codice fiscale o partita IVA aggiorna quello esistente.
- Se l'indirizzo usato è diverso dalla sede legale e non è già presente, lo registra come **sede operativa** dell'azienda.
- Confronto normalizzato (spazi, punti, maiuscole) per non creare doppioni; esito mostrato con un messaggio chiaro.
- Le nuove voci compaiono immediatamente nelle tendine, sia in ufficio sia nell'app dell'autista.

## 2. Due invii al RENTRI: partenza e arrivo
**Invio 1 — Partenza (già attivo, da rendere esplicito)**
- Pulsante "Emetti FIR e firma la partenza".
- Il RENTRI restituisce numero ufficiale, PDF e QR: da quel momento il QR mostrato ai controlli è valido.
- Nessun effetto su registro e giacenze.

**Viaggio**
- Stato "In viaggio", con QR ufficiale sempre a portata per polizia e vigili.

**Invio 2 — Arrivo (da separare e completare)**
- Pulsante "Sono arrivato": apre la fase di destinazione, non trasmette nulla e non tocca le giacenze.
- Si inseriscono peso reale, data e ora di arrivo, esito (accettato totale, parziale, respinto) ed eventuale motivazione.
- Pulsante "Firma del destinatario e invia l'arrivo al RENTRI": è la seconda trasmissione ufficiale.
- Solo dopo la risposta positiva del RENTRI il formulario si chiude, il movimento diventa effettivo e le giacenze si aggiornano tramite il punto unico autorizzato.
- Se l'invio dell'arrivo fallisce: il formulario resta in viaggio, niente chiusura e niente giacenze, con il formulario in coda per il rinvio.

## 3. Cosa resta invariato
- Bozze, partenze e semplici arrivi non muovono registro né giacenze.
- Cartacei: giacenze solo con conferma manuale della pesata.
- Cernite, privati e storico non vengono toccati.

## 4. Verifiche
- `node scripts/verify.mjs --smoke` e prove sul percorso completo.
- Confronto giacenze prima/dopo, incluse le righe nascoste, per dimostrare che nulla si muove fuori dai due momenti previsti.
- Nessun invio reale al RENTRI senza tua autorizzazione esplicita.
