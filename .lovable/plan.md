# PDF FIR ufficiale compilato

## Obiettivo
Il comando PDF della scheda FIR deve produrre il formulario ministeriale completo con gli stessi dati presenti nel riepilogo, non il foglio RENTRI vuoto con il solo numero.

## Intervento
- Usare i dati già caricati nella scheda come fonte unica per produttore, destinatario, trasportatore, rifiuto, viaggio, pesi ed eventuale chiusura.
- Sovrapporre questi dati alle tre pagine del modello ministeriale nelle coordinate già calibrate.
- Inserire esclusivamente numero, vidimazione e QR ufficiali recuperati dal RENTRI; se il QR manca, bloccare il documento anziché creare sostituti.
- Fare in modo che il pulsante PDF apra/scarichi questa versione compilata; conservare l'eventuale PDF grezzo RENTRI soltanto come originale separato e chiaramente nominato.
- Mostrare un errore esplicito se la configurazione dei campi del modello non è disponibile, evitando un PDF apparentemente valido ma vuoto.

## Verifica
- Aggiungere test che provino la mappatura dei dati principali della scheda sul formulario ufficiale.
- Verificare visivamente il PDF generato: tutte le pagine, campi leggibili e allineati, QR presente e nessuna sovrapposizione.
- Eseguire `node scripts/verify.mjs --smoke` e confermare che nessun dato, saldo, cernita o invio RENTRI sia stato modificato.
