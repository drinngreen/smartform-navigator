

# Piano di Implementazione — 4 Correzioni

## 1. Fix ricerca privati nei Conferimenti

**Problema**: La query in `MNMagazzinoPage.tsx` filtra i privati con `.eq("impianto_id", selectedImpianto)`, ma i 606 record importati hanno `impianto_id = NULL` e non esistono impianti nel database. Di conseguenza la lista e' sempre vuota.

**Soluzione**:
- Modificare la query di caricamento privati in `MNMagazzinoPage.tsx` per filtrare per `tenant_id` anziche' per `impianto_id` (stessa logica di `MNAnagraficaPrivatiPage.tsx`)
- Se non ci sono impianti, caricare i dati direttamente con il `tenant_id` hardcoded (`dc2a6046-...`)
- Aggiornare anche il dropdown di ricerca per funzionare correttamente

---

## 2. Aggiungere campi "Automezzo" e "Targa Automezzo" all'Anagrafica Privati

**Soluzione**:
- Migrazione DB: aggiungere colonne `automezzo` e `targa_automezzo` alla tabella `anagrafica_privati`
- Aggiornare l'interfaccia `Privato` e il form `PrivatoFormDialog` in `MNAnagraficaPrivatiPage.tsx` con i due nuovi campi
- Aggiungere le colonne alla tabella di visualizzazione

---

## 3. Risolvere sovrapposizione icone nel Desktop Admin

**Problema**: Le icone drag-and-drop possono sovrapporsi tra loro liberamente.

**Soluzione**:
- Modificare `DesktopIconGrid.tsx`: al termine del drag (mouseup), applicare uno snap-to-grid che allinea le icone a una griglia fissa
- Aggiungere una funzione di collision detection: se la posizione finale e' gia' occupata da un'altra icona, spostare automaticamente l'icona nella cella libera piu' vicina
- Questo impedira' sovrapposizioni sia dopo il drag sia al reset

---

## 4. Creare sezione "Storico Ricevute Privati" e importare il file XLSX

Il file contiene 881 ricevute (da 25/00001 a 25/00881) con campi: N. Doc, Data, Codice, Ragione, CF, Imponibile, Totale, Quantita Kg, Indirizzo, CAP, Citta, Prov, Pagamento.

**Soluzione**:
- Creare tabella DB `storico_ricevute_privati` con colonne: `numero_doc`, `data_doc`, `tipo_doc`, `codice_cliente`, `ragione_sociale`, `codice_fiscale`, `imponibile`, `totale_doc`, `quantita_kg`, `indirizzo`, `cap`, `citta`, `provincia`, `peso_netto`, `peso_lordo`, `metodo_pagamento`, `descrizione_pagamento`, `stato_ddt`, `quantita_fatturabile`, `tenant_id`
- RLS: admin-only (stessa policy delle altre tabelle)
- Creare pagina `MNStoricoRicevutePage.tsx` con tabella ricercabile, filtri per data/ragione/CF, e export PDF/Excel
- Aggiungere rotta `/mn/admin/:context/storico-ricevute`
- Aggiungere icona nel dashboard `MNContextDashboardPage.tsx`
- Importare tutte le 881 righe tramite SQL INSERT nel database

---

## Dettagli Tecnici

### File da modificare:
1. `src/pages/multynijol/MNMagazzinoPage.tsx` — fix query privati (tenant_id)
2. `src/pages/multynijol/MNAnagraficaPrivatiPage.tsx` — aggiungere campi automezzo/targa
3. `src/components/desktop/DesktopIconGrid.tsx` — snap-to-grid + anti-overlap
4. `src/pages/multynijol/MNContextDashboardPage.tsx` — aggiungere icona storico ricevute
5. `src/App.tsx` — aggiungere rotta storico ricevute

### File da creare:
1. `src/pages/multynijol/MNStoricoRicevutePage.tsx` — nuova pagina storico

### Migrazioni DB:
1. ALTER TABLE `anagrafica_privati` ADD COLUMN `automezzo` text, `targa_automezzo` text
2. CREATE TABLE `storico_ricevute_privati` + RLS + indici
3. INSERT delle 881 ricevute dal file XLSX

