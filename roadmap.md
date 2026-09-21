- [x] Audit strutturale stati FIR app: eliminare falsi positivi 202/QR/log
- [x] Audit strutturale cernite e numerazioni: garantire atomicità e idempotenza
- [x] Aggiungere guardie e test di invarianti senza modificare dati storici
- [x] Verifica completa con snapshot prima/dopo e smoke
- [x] Correggere il flusso di partenza FIR digitale: trasporto, stato/azioni, hash, firma valida, acquisizione e verifica finale (nessun invio reale senza autorizzazione)
- [x] Disattivare l'automatismo Dragon che riscrive le giacenze e nascondere temporaneamente tutte le viste Dragon
- [x] Ripristinare la vista Giacenze dalla fotografia certificata del 18/09 mattina più sole operazioni reali successive
- [x] Allineare la vista Giacenze esattamente ai PDF allegati del 18/09 e 19/09, con le due cernite già incluse e senza doppio conteggio
## Ripristino vista cernite e blocco automatismi
- [x] Individuare e ripristinare integralmente la precedente vista cernite di Magazzino Dev
- [x] Inventariare e disattivare ogni scrittura automatica collegata a Magazzino Dev/cernite
- [x] Consentire modifiche soltanto dopo un’azione umana esplicita
- [x] Verificare vista, regressioni e assenza di scritture automatiche

## Verifica registro privati allegato
- [ ] Identificare la causa tecnica della perdita delle 10 righe: cancellazioni UI, funzioni, trigger, automazioni, permessi e cronologia, senza scritture
- [ ] Stabilire se il rischio è ancora attivo e quali altri dati potrebbero essere coinvolti, con prove verificabili
- [ ] Verificare che visualizzazione, PDF ed Excel leggano l'intero registro corretto senza filtri o limiti nascosti
- [ ] Correggere solo la lettura/esportazione e validare contro le 359 righe dell'allegato; nessuna modifica ai dati senza autorizzazione

## Giacenze documentali definitive
- [x] Rendere consultabili, stampabili ed esportabili le giacenze giorno per giorno dal 18/07/2026
- [x] Usare il 18/09/2026 come fotografia di riferimento definitiva, non il 19/09 o il 21/09
- [x] Garantire che il 21/09/2026 sia la situazione finale, identica in ogni voce alla situazione attuale
- [x] Escludere scritture e automatismi; verificare PDF, Excel, stampa e controllo completo
