# Riordino RENTRI, confronto elenchi, preferiti e Dark Lemon OCR

Regola assoluta valida per tutto il lavoro: **le giacenze non vengono toccate**. Nessuna riga di magazzino, Dragon o cernite viene creata, modificata o ricalcolata. Snapshot prima e dopo a prova.

## 1. Stati dei registri rimessi in ordine

- Lo stato "inviato" viene letto direttamente dal RENTRI per **tutti** i registri (Impianto, Conto Proprio, Privati, Niyol, Intermediazione), non più solo per Intermediazione.
- Ogni movimento fino al **31 luglio 2026 incluso** risulta trasmesso: è il confine storico che hai indicato.
- Restano "da inviare" solo i movimenti di agosto e settembre che sul registro RENTRI non risultano presenti.
- Le righe considerate trasmesse non sono selezionabili né inviabili: doppio invio impossibile.
- Abbinamento per numero formulario e, se assente, per data + codice rifiuto + chilogrammi.

## 2. Confronto con i tuoi quattro elenchi

Elenchi letti: Impianto 155 righe, Conto Proprio 124, Niyol 103, Intermediazione 7, dal 01/07/2026 al 15/09/2026.

- Pagina di confronto che mostra, per ciascun elenco, i formulari presenti nel file e assenti nel sistema, con tutti i dati (numero, data, rifiuto, produttore, destinatario, chili, stato).
- Inserimento dei soli mancanti nel registro corrispondente, uno per uno o in blocco, con conferma.
- Gli inserimenti sono di sola registrazione documentale: nessun effetto su giacenze, cernite o Dragon, e nessun invio automatico al RENTRI.
- Le bozze presenti negli elenchi restano segnalate come bozze e non vengono registrate.

## 3. Pulsantiera dei preferiti nella console centrale

- Barra in alto con scorciatoie: Registri C/S, Invii al RENTRI, Movimenti RENTRI, Compila FIR, Giacenze, Cernite.
- Ogni pulsante porta esattamente alla pagina corrispondente.
- Possibilità di aggiungere e togliere i preferiti, con l'ordine salvato per utente.

## 4. Vista totale invii

- Un'unica schermata con tutti i movimenti di tutti i registri: inviati e da inviare, filtri per registro, mese e stato, export Excel e PDF.

## 5. Dark Lemon

- Correzione della creazione dipendenti: oggi non porta a termine l'operazione.
- Correzione della compilazione assistita nelle app: i campi non si aprono e non vengono compilati.
- Nuova lettura da foto (OCR) nelle app autisti: si fotografa un formulario cartaceo o un elenco, Dark Lemon legge, riordina i dati e propone la compilazione. Il salvataggio resta sempre soggetto a conferma della persona.

## Verifica finale

Prove automatiche sul confine 31 luglio, sulla separazione dei registri e sul confronto elenchi; controllo delle schermate nel browser; snapshot giacenze e cernite identici prima e dopo.
