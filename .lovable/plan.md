

## Ricarica Pool FIR Global Reco e Distribuzione Automatica

### Situazione Attuale
- **663 utenti** Global Reco totali
- **242 utenti** senza nessun formulario disponibile
- **125 numeri** disponibili non assegnati a utenti Global
- **1 utente** con 99 numeri disponibili, **1 utente** con 25 -- numeri in eccesso da ridistribuire

### Operazioni

**Step 1 - Inserimento 100 nuovi numeri XNQLK (052201-052300)**
Inserimento nella tabella `fir_number_pool` con `status = 'available'`, `societa_id = 'global'`, senza assegnazione utente.

**Step 2 - Ridistribuzione equa**
Script SQL che:
1. Libera i numeri in eccesso dagli utenti che ne hanno piu di 1 disponibile (mantenendo 1 per utente)
2. Assegna 1 numero disponibile a ciascuno dei 242 utenti che non ne hanno

Dopo questa operazione, con 125 (esistenti non assegnati) + 100 (nuovi) + ~120 (eccesso ridistribuito) = **~345 numeri**, piu che sufficienti per coprire i 242 utenti mancanti. Ogni utente Global avra esattamente 1 formulario reale RENTRI.

### Dettagli Tecnici

- Migrazione SQL con:
  - `INSERT INTO fir_number_pool` per i 100 numeri XNQLK
  - `UPDATE` per rimuovere `user_id` dai numeri in eccesso (mantiene solo 1 per utente)
  - Loop di assegnazione: per ogni utente senza numeri disponibili, assegna il primo numero libero dal pool `global`
- Nessuna modifica al codice frontend/backend
- I numeri saranno tutti con `societa_id = 'global'` per garantire che siano esclusivamente per Global Reco

