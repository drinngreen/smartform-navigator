## Piano operativo Multyproget / Niyol — versione aggiornata

Obiettivo: rendere l'app affidabile per i clienti, eliminare definitivamente i FIR sbagliati pescati dai serbatoi, ricostruire le app autisti, dare alla segreteria controllo totale dalla dashboard Multydev.

---

## 1. Reset completo delle app esistenti

Le app autisti Multyproget e Niyol vanno azzerate dallo storico vecchio:

- archivio delle vecchie bozze/FIR non chiusi che non corrispondono ai 17 ragazzi attuali, in modalità soft-delete (asymmetric deletion, niente cancellazioni distruttive).
- pulizia dei dati persistenti locali (zustand/localStorage) lato app autista così non riappaiono vecchi numeri al login.
- lo storico resta consultabile solo dalla segreteria/admin Multydev a scopo audit, non più dall’app del ragazzo.

Ogni ragazzo riparte da app pulita, vede solo i FIR a lui assegnati da oggi in poi.

---

## 2. Una app per ogni ragazzo

- ogni ragazzo ha la sua app personale (login dedicato) con i suoi formulari e basta.
- la segreteria ha anch'essa la sua app dedicata (vista “segreteria Multydev / Niyol”) per gestione e creazione FIR.
- isolamento per `user_id` lato `fir_forms` e per `tenant_id` Multyproget/Niyol.

---

## 3. Multydev: la segreteria gestisce gli utenti

Dal pannello Multydev la segreteria può:

- creare un nuovo ragazzo → genera lo user, profilo e l'app dedicata al ragazzo, già pronta al login;
- impostare la società di appartenenza (Multyproget o Niyol);
- assegnare nome, cognome, CF, targa, password iniziale;
- eliminare una app ragazzo → soft-delete dello user/profilo (l’app non sarà più accessibile, lo storico FIR resta visibile alla segreteria);
- resettare password.

Punto di partenza utenti: l’elenco allegato dei 17 ragazzi (`elenco_ragazzi.xlsx`), creati una volta sola e poi gestiti dalla segreteria.

---

## 4. Spezzare il collegamento serbatoi → app

Causa principale dei FIR sbagliati: i serbatoi distribuivano numeri in automatico.

- nessuna funzione automatica di assegnazione FIR resta attiva per Multy/Niyol (auto_distribute, auto_assign_after_consume, ensure_user_has_fir_draft, trigger su pool).
- l'app autista non legge più dai serbatoi.
- i serbatoi vengono congelati per Multy/Niyol: restano come archivio tecnico, non come fonte operativa.
- l’unico modo per assegnare un numero FIR è manuale o tramite pesca RENTRI fatta dalla segreteria (vedi punto 5).

---

## 5. Segreteria: pesca formulari dal RENTRI

La segreteria Multydev può, sia per Multyproget sia per Niyol:

- collegarsi al RENTRI tramite la nuova VPS che sarà ricreata da zero senza Global;
- pescare un singolo numero di formulario fornito dal RENTRI;
- pescare in blocco i prossimi N numeri assegnati alla società scelta;
- decidere subito cosa farne:
  1. assegnare il FIR a un ragazzo specifico → entra nella sua app;
  2. lasciare il FIR “non assegnato” → resta in un’area “FIR pronti, non assegnati” gestita solo dalla segreteria;
  3. usarlo come FIR cartaceo da stampare (vedi punto 7).
- finché la VPS non è ricreata: la pesca RENTRI è disattivata in modo chiaro (“VPS RENTRI da configurare”), non genera errori finti né numeri inventati.

---

## 6. Segreteria: creazione FIR senza ragazzo

La segreteria può creare un formulario:

- inserendo direttamente il numero FIR fornito;
- scegliendo società (Multyproget o Niyol);
- senza assegnarlo a nessun ragazzo: il FIR resta sul tenant, lavorabile solo dalla segreteria;
- in qualsiasi momento può essere riassegnato a un ragazzo (la sua app lo vedrà comparire) oppure essere completato dalla segreteria stessa.

Doppia vista per la segreteria sullo stesso FIR:

- Modulo Standard;
- Modulo Alternativo;
- switch sempre visibile, dati condivisi, niente perdita compilazione.

---

## 7. FIR cartacei stampabili

La segreteria deve poter generare FIR cartacei già numerati:

- selezione società Multyproget / Niyol;
- inserimento o pesca dei numeri FIR da assegnare;
- generazione PDF stampabile, una pagina per FIR, con il numero FIR già scritto in ogni pagina nella posizione corretta del modulo;
- registrazione del FIR come “cartaceo”: numero usato, non riproponibile;
- il FIR cartaceo non finisce nelle app dei ragazzi, ma resta tracciato nello storico segreteria.

---

## 8. App ragazzo: cosa vede e cosa può fare

- login dedicato;
- lista pulita: solo i FIR che la segreteria gli ha assegnato;
- nessuna creazione automatica al login;
- creazione manuale possibile solo se il ragazzo ha ricevuto un numero FIR esplicito da inserire;
- doppia vista sullo stesso formulario: Modulo Standard e Modulo Alternativo, switch sempre visibile;
- invio a RENTRI: disabilitato in modo chiaro finché la nuova VPS non è pronta;
- quando il RENTRI risponderà, il QR code ufficiale viene mostrato nell’app del ragazzo (non più letto dal serbatoio, ma salvato direttamente sul FIR).

---

## 9. RENTRI e QR code con nuova VPS

- isolamento del codice RENTRI in funzioni dedicate Multyproget/Niyol;
- nessun invio reale parte se la VPS non è configurata;
- quando la VPS risponderà:
  - salvataggio del QR code direttamente nel FIR;
  - visualizzazione del QR ufficiale nell’app ragazzo e nella vista segreteria;
  - stato “in attesa QR RENTRI” se manca, niente QR inventati.

---

## 10. Giacenze Multydev

Attualmente non si aggiornano perché convivono vecchio sistema (`magazzino_giacenze`, `movimenti_impianto`, `registro_generale`) e nuovo Dragon (`dragon_*`).

- la vista Multydev passa a leggere dal modello Dragon corretto, isolato per `company_id` Multyproget;
- ogni FIR salvato come definitivo (carico/scarico) genera un movimento Dragon coerente;
- giacenze ricalcolate dai movimenti, non da valori scollegati;
- invalidazione React Query dopo ogni salvataggio così l’admin vede subito l’aggiornamento;
- vecchie viste rimosse dai flussi operativi o marcate come archivio storico.

---

## 11. Verifiche obbligatorie prima di dichiarare ok

Una a una:

1. Reset app: nessuno storico vecchio compare al login di un ragazzo.
2. Creazione user ragazzo da Multydev: nuova app accessibile subito con login dedicato.
3. Eliminazione user ragazzo da Multydev: l’app non è più accessibile, lo storico resta visibile alla segreteria.
4. Segreteria crea FIR Multyproget senza assegnarlo: appare solo nella sua area, non nelle app dei ragazzi.
5. Segreteria assegna lo stesso FIR a un ragazzo: compare nella sua app.
6. Segreteria crea FIR cartaceo: PDF stampato con numero FIR su ogni pagina, FIR marcato come cartaceo.
7. Pesca RENTRI: con VPS off mostra stato “da configurare”; con VPS on importa i numeri reali.
8. Nessuna creazione automatica al login del ragazzo.
9. Doppia vista Standard/Alternativo funziona su segreteria e ragazzo, dati condivisi.
10. Giacenze Multydev si aggiornano dopo carico/scarico.
11. Nessuna query verso `fir_number_pool` viene usata per generare nuovi FIR Multy/Niyol.

---

## 12. Sequenza di implementazione (blocchi verificabili)

### Blocco A — sicurezza FIR e reset storico
- bonifica serbatoi Multy/Niyol e disattivazione automatismi residui;
- soft-delete degli storici vecchi non riconducibili ai 17 ragazzi;
- pulizia storage locale app autista al primo avvio post-reset.

### Blocco B — gestione utenti Multydev
- creazione/eliminazione user ragazzo dalla dashboard segreteria;
- gestione password;
- inserimento iniziale dei 17 ragazzi dall’elenco allegato.

### Blocco C — app ragazzo nuova
- app dedicata per ogni ragazzo, lista FIR assegnati, nessuna creazione automatica;
- doppia vista Standard/Alternativo.

### Blocco D — segreteria operativa
- creazione FIR manuale per società (con o senza assegnazione);
- assegnazione/riassegnazione a ragazzo;
- pesca RENTRI singola e in blocco (predisposta, attiva al ritorno VPS);
- generazione FIR cartacei stampabili con numero su ogni pagina.

### Blocco E — RENTRI/QR su nuova VPS
- modalità “VPS non configurata” chiara;
- salvataggio QR nel FIR;
- attivazione invii reali quando la VPS sarà pronta.

### Blocco F — giacenze Multydev
- allineamento al modello Dragon;
- aggiornamento giacenze su movimento;
- refresh UI immediato dopo salvataggio FIR.

Procederei nell’ordine A → B → C → D → E → F, verificando ogni blocco prima di passare al successivo, così non si ripetono gli errori precedenti.