# Certificazione RENTRI: come posso dartela davvero

Oggi si lavora su RENTRI. Per poterti dire "funziona" senza inventare nulla, serve
una procedura di certificazione con prove verificabili, non opinioni.

## Cosa posso certificare da solo (senza toccare dati)

1. **Prove automatiche ripetibili**
   - Test di regressione su validazione numero FIR, payload di emissione, payload registro,
     QR ufficiale (Base45/COSE), deduplica invii, import formulari.
   - Prove su payload reali già presenti in archivio, eseguite in memoria: nessuna riga scritta,
     nessuna chiamata al RENTRI.
   - Esito mostrato per intero, non riassunto.

2. **Simulazione completa a secco ("dry run")**
   - Un interruttore di sola simulazione che percorre tutto il tragitto
     (formulario -> validazione -> costruzione messaggio -> firma -> punto di invio)
     e si ferma un istante prima di parlare col RENTRI, mostrando esattamente
     il messaggio che sarebbe partito.
   - Serve a dimostrare che il contenuto è corretto, senza inviare.

3. **Controllo di collegamento in sola lettura**
   - Interrogazioni che non creano nulla: elenco blocchi, elenco formulari, stato di una
     transazione già esistente, per Multy e Niyol.
   - Dimostrano che certificati, firma e canale funzionano davvero, su entrambe le aziende.

4. **Foto dei saldi prima/dopo ogni prova**
   - Giacenze, movimenti visibili e nascosti, cernite: confronto numerico prima e dopo.
   - Se cambia anche un solo chilo senza un evento autorizzato, mi fermo.

## Cosa NON posso certificare senza il tuo via libera

Un **invio reale** (un formulario e un movimento a registro) è l'unica prova che chiude il cerchio.
Senza quello posso dimostrare che il contenuto è corretto e che il canale risponde,
ma non che il RENTRI accetta e restituisce ricevuta.

Proposta minima, sotto tuo controllo:
- 1 formulario reale su Multy, scelto da te, con tutti i dati veri.
- 1 movimento a registro collegato solo dopo la chiusura di quel formulario.
- Per Niyol lo stesso, in un secondo momento.
- Ogni passo mostrato prima dell'invio e confermato da te; risposta del RENTRI riportata integrale.

## Esito finale

Un referto unico con: elenco prove, esito di ciascuna, risposte del RENTRI, saldi prima/dopo,
e l'elenco esplicito di ciò che resta scoperto. Nessuna frase di garanzia senza una prova accanto.
Ogni voce del referto deve riportare la prova a cui si riferisce.

## Ordine di lavoro di oggi

1. Prove automatiche e simulazione a secco (io, subito).
2. Controlli di collegamento in sola lettura su Multy e Niyol (io, subito).
3. Prova reale guidata (solo con tuo via libera, passo per passo).
4. Referto finale e aggiornamento di guide e assistente.
5. Mi fermo subito se una prova altera i saldi fuori dai percorsi autorizzati.
