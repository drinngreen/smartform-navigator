# Riordino stati dei registri RENTRI

## Obiettivo
- Usare per ogni registro la lettura diretta, in sola lettura, dei movimenti presenti sul RENTRI.
- Considerare già trasmessi tutti i movimenti con data fino al 31 luglio 2026 incluso, come richiesto.
- Mostrare come da inviare soltanto agosto e settembre non trovati nel rispettivo registro RENTRI.
- Impedire selezione e invio delle righe considerate già trasmesse.

## Intervento
- Estendere la riconciliazione RENTRI oggi attiva solo per Intermediazione anche a Impianto, Conto Proprio, Privati e Niyol.
- Abbinare ogni riga al suo registro esclusivamente per FIR oppure, quando manca, per data + EER + quantità.
- Applicare il confine storico del 31/07/2026 come stato “inviato storico”, senza creare invii, ricevute o modifiche ai dati.
- Eliminare dalla console il vecchio elenco parallelo che decideva lo stato solo dagli invii fatti dall’app, usando un’unica vista coerente.
- Aggiungere prove automatiche sul confine 31 luglio/1 agosto e sulla separazione tra registri.

## Sicurezza e verifica
- Nessun invio RENTRI reale durante il lavoro.
- Nessuna modifica a registri storici, giacenze, Dragon o cernite.
- Snapshot prima/dopo e verifica completa con smoke test della console.
