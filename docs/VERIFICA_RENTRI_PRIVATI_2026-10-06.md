# Verifica in sola lettura — 06/10/2026

## Ambito e limiti
Nessun invio RENTRI, modifica di giacenze/cernite/registri o chiamata Sibill eseguita da questa verifica. La nuova vista è stata provata con risposte simulate e scritture bloccate dal browser; queste prove non attestano una connessione reale. Le evidenze reali sotto sono letture SQL appena eseguite dei risultati già conservati: non nuove chiamate al RENTRI.

Il proxy esistente salva anche le chiamate GET in `rentri_operazioni` (`handler.ts:417-437,690-707`). Per rispettare le prove senza traccia non è stato chiamato. Non sono stati rimossi audit, né disattivato il tracciamento. Per una verifica live senza scritture serve un canale GET diagnostico approvato che non persista risultati; in alternativa occorre autorizzare la sola registrazione tecnica delle letture.

## Vista formulari
Nuova prima scheda «Tutti i formulari», società separate, filtro per ruolo incluso intermediario, ricerca FIR/soggetto, periodo emissione, stato ufficiale e dettaglio riletto, PDF/Excel. Fonte: GET elenco per codice fiscale senza filtro di unità locale. Nessuna registrazione automatica.

**Completezza non certificata:** le risposte recenti della vista preesistente contengono esattamente 100 elementi. Non è documentata in questo progetto la paginazione ufficiale di questo endpoint. La nuova vista mostra il numero restituito e avvisa alla soglia 100; non può essere dichiarata un elenco integrale fino alla verifica della paginazione. Non sono stati inventati parametri di pagina.

## RENTRI fase per fase
| Fase | Evidenza conservata letta ora | Conclusione consentita |
|---|---|---|
| Collegamento/elenco Multy | GET elenco, HTTP 200, 100 elementi, 06/10 06:20:12 UTC | L'elenco rispondeva allora, non certificazione attuale di ogni fase |
| Vidimazione Multy | GET blocchi HTTP 200, 05/10 14:41:26 UTC | Lettura blocchi riuscita allora |
| Vidimazione Niyol | GET blocchi HTTP 200, 18/09 13:24:04 UTC | Evidenza più vecchia, da ricontrollare live |
| Dettaglio Multy/Niyol | GET SXPVW000016FR e MCNRX000542WD, HTTP 200, 06/10 04:54 UTC | Entrambe le società hanno ottenuto quei dettagli |
| Partenza/firma | FRVKM001315HL: dettaglio 21/09 09:14:52 UTC, versione 13, stato_formulario InserimentoAccettazione | Evidenza storica, non nuova attestazione firma o chiusura |
| Accettazione | Elenco 06/10 06:23:04 UTC contiene stati Accettato e InserimentoAccettazione | Le fasi sono distinte; InserimentoAccettazione non va etichettato chiuso |
| Registri Multy | GET RAH20NP7O40, RQCTGTP7NT0, RQEL39R7NS0 HTTP 200, 05/10 14:54 UTC | Letture impianto, trasporto e intermediazione riuscite allora |
| Registro Niyol | GET RTR31497PX0 HTTP 200, 05/10 14:54:42 UTC | Lettura trasporto riuscita allora |
| Invio, autorizzazione firma, transazioni | Nessuna operazione reale eseguita | Non verificabili integralmente con soli risultati storici; HTTP 202 mai esito finale |

## Dieci righe privati
Lettura attuale:
- `privati_conferimenti`: 351 righe, 83.309,17 kg.
- `ricevute_privati`: 351 righe.
- `rentri_invii_privati`: 361 righe; 10 hanno `conferimento_id IS NULL`, totale 1.412 kg, stato locale CONFERMATO.
- Numeri archivio: 128 (345 kg), 351 (120), 352 (15), 353 (32), 354 (10), 355 (12), 356 (43), 357 (200), 358 (500), 359 (135). Somma 1.412 kg.
- Nessun riferimento non nullo orfano. Non significa che nessuna riga sia sparita: le dieci non hanno più/mai avuto un collegamento identificativo verificabile.
- Tutte le dieci righe archivio hanno `created_at=2026-09-14 03:36:04.349524+00`; questa data non dimostra quando furono cancellati eventuali originali.

**Contraddizioni precedenti:** la chat del 20/09 includeva anche n.110 da 361 kg, elencando undici righe ma dichiarandone dieci e 1.412 kg; includeva inoltre CER 170405 per tutte, mentre l'archivio attuale contiene sottocodici 200140. Non usare quella ricostruzione come prova di identità, autore o causa.

**Causa e autore non dimostrati:** esisteva codice di cancellazione fisica; oggi `PrivatiMovimentiWidget.tsx:261-264` interrompe il percorso di cancellazione. Senza audit degli originali non si può stabilire se queste dieci righe furono eliminate dall'operatrice, da un bug, da un intervento tecnico o se derivino da una diversa importazione. La vecchia attribuzione certa ad «azione umana» era infondata e va ritirata.

**Rischio attuale, verificato nel catalogo DB:**
- Il vecchio trigger `trg_reverse_privati_conferimento_on_delete` NON è presente tra i trigger attuali. Una vecchia migrazione lo aveva rimosso: non va dichiarato attivo basandosi sulla sola migrazione originaria.
- `has_table_privilege` restituisce DELETE=true per anon/authenticated/service_role, ma RLS limita le righe: anon non equivale ad accesso pubblico. Le due policy ALL consentono accesso ad amministratori (una con isolamento tenant).
- Quindi blocco frontend non equivale a divieto DB di cancellazione per un amministratore.
- Il trigger di sincronizzazione dei conferimenti su INSERT/UPDATE è attivo; la definizione corrente scrive movimenti e applicazioni giacenze. Non è un processo programmato e non è stato eseguito qui. La sua esistenza contraddice una generica dichiarazione di «nessun trigger». Nessuna modifica apportata.
- `dragon_audit_logs`: 34 eventi totali, nessuno con entity_type relativo a privati/conferimenti. Questo non prova l'assenza di qualunque audit esterno.

Per attribuire autore/data occorre un backup o audit originale antecedente alla sparizione. Non ripristinare, cancellare o riclassificare dati per risolvere la contraddizione senza istruzione umana.

## Prove e conteggi
Browser isolato: filtro intermediazione, ricerca, dettaglio, download Excel (17.259 byte) e PDF (4.185 byte), zero errori runtime. Screenshot sotto /tmp/browser/rentri-audit (dati fittizi non salvati).
Regressioni: 22 file, 145 test superati. Segnale anteprima: build OK.
Conteggi attuali: conferimenti 351, ricevute 351, registro_generale 1.444, cernite Dragon 26. Nessuna scrittura operativa effettuata da questa verifica.
Il gate storico verify.mjs include un typecheck manuale: non eseguito perché le istruzioni della piattaforma vietano compilazioni/typecheck manuali; usati test e segnale compilazione anteprima.