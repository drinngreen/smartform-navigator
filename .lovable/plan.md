
# Piano Completo di Risoluzione - Tutti i Problemi Critici

## Problemi e Soluzioni

### 1. Drag & Drop icone non funziona
**Causa**: Il componente `DesktopIconGrid` usa `onMouseDown` + `onClick` sullo stesso elemento. Il `handleClick` naviga via anche durante il drag perche' il timeout di 50ms su `isDragging.current = false` e' troppo breve o il click event si registra prima del timeout.
**Fix**: Aggiungere una soglia di movimento minimo (5px) prima di attivare `isDragging`, e usare `e.preventDefault()` + `e.stopPropagation()` nel mouseDown per evitare conflitti. Separare click e drag con un `dragDistance` counter.

### 2. GPS Flotta non funzionante
**Causa**: La pagina esiste e il codice di tracking in `MobileAppPage` invia dati, ma:
- Il campo `targa_automezzo` potrebbe non esistere nella tabella `profiles` (errore silenzioso nella query GPS)
- Non c'e' un pulsante di refresh manuale nella pagina GPS
- La finestra temporale di 5 minuti e' troppo stretta per test

**Fix**:
- Verificare e aggiornare la query per gestire campi mancanti
- Aggiungere refresh manuale e ampliare la finestra a 30 minuti
- Aggiungere un contatore "Ultimo aggiornamento" e auto-refresh piu' frequente (15s)

### 3. Personale - pulsanti modifica password e eliminazione
**Stato attuale**: I pulsanti ESISTONO gia' (KeyRound cyan, Trash2 red) con le dialog funzionanti. Il problema e' che i pulsanti `ghost` su sfondo scuro sono quasi invisibili.
**Fix**: Sostituire i pulsanti ghost con pulsanti con sfondo pieno e ben visibile:
- Pulsante password: sfondo cyan con icona Pencil (matita) bianca, non solo icona ghost
- Pulsante elimina: sfondo rosso con icona Trash2 bianca
- Aggiungere label testuale accanto all'icona per chiarezza

### 4. Registro FIR - pulsanti azione invisibili
**Causa**: Il pulsante "Modifica Bozza" appare SOLO per status `draft`, con stile ghost quasi invisibile. Per gli altri stati non c'e' nessun pulsante.
**Fix**:
- Aggiungere pulsanti visibili per TUTTI gli stati: Visualizza (occhio, cyan), Modifica (matita, per bozze), Scarica JSON (download, verde), Elimina (cestino, rosso)
- Usare pulsanti con sfondo colorato, non ghost
- Sfondo pieno con bordo colorato per massima visibilita'

### 5. Messaggi Admin - pagina vuota
**Causa**: `AdminMessagesPage.tsx` e' un placeholder vuoto (solo testo statico). Non usa affatto `useMessages` o la lista conversazioni.
**Fix**: Ricostruire completamente la pagina:
- Lista conversazioni sulla sinistra (tutti gli utenti che hanno scritto)
- Chat sulla destra con lo storico messaggi
- Input per scrivere e inviare messaggi con allegati
- Usare `useMessages` hook gia' esistente che ha `fetchConversations` per admin
- Supportare la rotta `/admin/messaggi/:partnerId` gia' definita in App.tsx

### 6. Telefonate non funzionano
**Causa**: Il sistema di chiamate e' completamente stub:
- `CallContext` restituisce solo `{ isCallActive: false }`
- `CallManager` restituisce `null`
- `AdminCallDialog` restituisce `null`
- `useWebRTCCall`, `useOfficeCall`, `useOfficeWebCall` sono tutti stub
- Nessun codice Retell SDK presente nel progetto (nonostante la chiave API sia configurata)
- Non esiste una edge function per creare web calls

**Fix**: Implementare il sistema di chiamate Retell AI:
- Creare edge function `retell-call` per creare web calls tramite API Retell
- Implementare il `CallContext` con logica reale di chiamata
- Aggiungere pulsante chiamata nella pagina messaggi admin (per chiamare singoli utenti)
- Aggiungere pulsante "Disattiva ricezione / Attiva segreteria" nell'header admin

### 7. Pulsante disattivazione chiamate / segreteria
**Fix**: Aggiungere nell'`AdminHeader` un toggle Phone con stati:
- Attivo (verde): ricezione chiamate attiva
- Disattivo (rosso): segreteria Retell attiva
- Lo stato viene salvato in localStorage per persistenza

---

## Dettagli Tecnici

### File da modificare

1. **`src/components/desktop/DesktopIconGrid.tsx`** - Fix drag & drop con soglia di movimento
2. **`src/pages/admin/GPSFlottaPage.tsx`** - Finestra 30min, refresh manuale, gestione errori
3. **`src/pages/admin/PersonalePage.tsx`** - Pulsanti con sfondo pieno (cyan/rosso) + label + icona matita
4. **`src/pages/admin/RegistroFIRPage.tsx`** - Pulsanti azione visibili per tutti gli stati
5. **`src/pages/admin/AdminMessagesPage.tsx`** - Ricostruzione completa con chat funzionante
6. **`src/components/layout/AdminHeader.tsx`** - Aggiunta toggle ricezione chiamate
7. **`src/contexts/CallContext.tsx`** - Implementazione reale con Retell SDK

### Nuovi file

8. **`supabase/functions/retell-call/index.ts`** - Edge function per creare web calls Retell
9. **Nessuna modifica al database** - Le tabelle `messages`, `driver_locations` esistono gia' con RLS corrette

### Stile pulsanti (regola anti-nero-su-nero)
Tutti i pulsanti di azione useranno:
- Sfondo colorato solido (non trasparente/ghost)
- Testo bianco
- Bordo luminoso coordinato
- Hover con brightness aumentata
- Esempio: `bg-cyan-500/80 text-white border border-cyan-400 hover:bg-cyan-400`

### Messaggi Admin - Architettura
La pagina usera' un layout a due colonne:
- Colonna sinistra: lista conversazioni da `useMessages().conversations`
- Colonna destra: chat attiva con messaggi in tempo reale
- La URL `/admin/messaggi/:partnerId` seleziona automaticamente la conversazione
- Pulsante "Nuova conversazione" per contattare qualsiasi utente dalla lista personale

### Retell AI - Flusso chiamata
1. Admin clicca "Chiama" su un utente
2. Frontend chiama edge function `retell-call` con `agent_id` configurato
3. Edge function usa `RETELL_API_KEY` per creare una web call via `POST https://api.retell.ai/v2/create-web-call`
4. Frontend riceve `access_token` e avvia `RetellWebClient`
5. Toggle segreteria salva stato locale e disabilita la ricezione incoming
