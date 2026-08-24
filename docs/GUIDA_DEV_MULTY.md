# 📘 Guida Completa — Dev Multy (Multyproget · Centro di Comando)

> Documento operativo unico. Chi lo legge deve poter usare Dev Multy dal primo click all'ultimo, senza esperienza pregressa.
> **Ultimo aggiornamento: 18 agosto 2026.** Tutte le novità sono **integrate nelle rispettive sezioni** (non c'è più un capitolo separato "Novità"): quello che leggi qui è lo stato attuale del software.

---

## 0. Accesso e struttura

- URL: `/mn/admin/dev-multyproget`
- Accesso riservato agli admin whitelistati Multyniyol.
- Ogni tab è persistita in URL (`?tab=impianto`, `?tab=registri&sub=generale`). Ricaricando o condividendo il link torni esattamente dove eri.
- La sessione si rinnova in background **senza smontare la pagina**: dialog aperti e moduli in compilazione restano dove sono.

Legenda colori delle tab:
- 🟢 Verde = area Multyproget (Impianto, Registri, Privati, ecc.)
- 🔵 Ciano = Niyol
- 🔴 Rosso = Magazzino Dev (Dragon Rifiuti 2)
- 🟠 Ambra = allerta / MUD / CER preferiti
- 🟣 Viola = firma digitale / invii RENTRI
- 🟡 Giallo = Personale

---

## 1. Formulari: regole valide OVUNQUE

Queste regole valgono in **tutti** i punti in cui si compila un formulario: Impianto, Conto Proprio, Contatti, Niyol, workspace FIR, bozze RENTRI, app degli autisti.

### 1.1 Il numero FIR si assegna solo a mano
- L'assegnazione **automatica** dei numeri FIR è **disattivata** (i trigger di auto-assegnazione sono stati rimossi). Nessun formulario compare "da solo".
- Un formulario nasce in due modi:
  1. **Digiti il numero** (formato RENTRI o cartaceo) e clicchi **Crea formulario**: la bozza si apre subito;
  2. **Assegni un numero dal Centro App & FIR** a un autista o all'ufficio.
- Nel **Centro App & FIR** puoi: assegnare **più numeri** allo stesso autista (chip multipli), contrassegnare un numero come **"Assegnato all'ufficio"** (lo usa direttamente l'admin) e **copiare** il numero con un click.
- Le app degli autisti **non partono più con un FIR precaricato**: mostrano l'elenco dei numeri che gli hai assegnato.

### 1.2 Due viste, un solo formulario
- Ogni formulario è creabile e modificabile sia in **Modulo Standard** (`MNFIRFormComplete`) sia in **Modulo Alternativo** (`FIRAlternativeForm`).
- Le due viste sono **sincronizzate in tempo reale**: quello che scrivi in una compare nell'altra, perché scrivono sullo **stesso record `fir_forms`**. Non si duplica nulla.
- Puoi passare da una vista all'altra in qualsiasi momento, anche a metà compilazione.

### 1.2-bis Tendina CER nel formulario (sezione 6 — Caratteristiche del Rifiuto)
- Il campo **Codice EER / CER** è una **tendina di ricerca** (`CerPickerField`): scrivi il codice o una parola della descrizione e scegli dalla lista.
- Di default mostra i **CER preferiti** (quelli realmente movimentati); con la spunta **"Tutti i CER europei"** accedi all'intero catalogo. La ⭐ indica i preferiti, la **P** rossa i pericolosi.
- Alla selezione la **descrizione del rifiuto si autocompila** (voce ufficiale del catalogo) e il codice viene normalizzato nel formato `17 04 05`.
- La stessa tendina è presente nel **Modulo Alternativo**, direttamente sul riquadro CER del modulo fisico: la scelta compila anche il campo "Descrizione rifiuto" del modulo.
- Poiché entrambe le viste scrivono sullo stesso record, il CER e la descrizione finiscono automaticamente nella **stampa del modulo ufficiale**, nel **documento di viaggio** e nel **riepilogo del trasporto** (e quindi in registri e giacenze al salvataggio definitivo).

### 1.3 Cancellazione e reset
- Ogni bozza si elimina con l'icona **🗑 cestino** (soft delete `deleted_by_user`): registro e giacenze vengono **stornati automaticamente**.
- Ogni sezione del modulo (Produttore, Destinatario, Trasportatore, Rifiuto, Quantità, Trasporto) ha il pulsante **gomma 🧽 "Cancella sezione"**: azzera solo quel blocco, lasciando intatto il resto.

### 1.4 Salvataggio e sincronizzazione
- **Salva bozza**: il formulario resta modificabile; le giacenze tornano al valore di partenza (una bozza non movimenta il magazzino).
- **Salva definitivo** (`completato`): parte `syncFirFinalToRegistryAndInventory` (`src/lib/firFinalSync.ts`):
  - scrive in `registro_generale` per **ogni** tenant coinvolto (Multy e/o Niyol) in base al Codice Fiscale;
  - aggiorna `movimenti_impianto` **solo se Multyproget è produttore o destinatario** (`origine='fir_final'`, idempotente su `fir_id`).

⚠️ **Non modificare `firFinalSync.ts`.** È il cuore della doppia contabilità Multy/Niyol.

### 1.5 Fatturazione dal formulario
Il blocco **"Crea fattura da questo formulario"** appare **solo nei formulari compilati da ufficio/admin** (prop `enableFatturazione`). Nelle app degli autisti non esiste.

---

## 2. TAB **Impianto**

Modulo storico dell'impianto Multyproget (via Rivarossa 18/20).

### 2.1 Cosa vedi
- Elenco movimenti impianto (`movimenti_impianto`) filtrabili per data, CER, tipo (CARICO/SCARICO), ruolo (PRODUTTORE/DESTINATARIO). Il contesto Impianto mostra **solo** i movimenti dell'impianto (mai quelli di Conto Proprio).
- Widget giacenze aggregate.
- Elenco formulari (`DevFormulariList`) con: CER, produttore, destinatario, trasportatore, **quantità partenza / quantità arrivo**.
  - Riga **gialla/ambra** se il formulario è `completato` ma manca `peso_destino`.
  - Pulsanti fine riga: **Standard**, **Alternativo**, **Duplica**, **🗑 Cestino** (vedi Sezione 1).
- Pulsante **Sync giacenze** sui movimenti: ricalcola i saldi (permessi corretti, funziona).

### 2.2 Regole giacenze (tassative)
Le giacenze si aggiornano **solo** se Multyproget è produttore o destinatario. Se Multy è solo trasportatore → nessun impatto su `magazzino_giacenze` (è corretto, non è un bug).

- **Multy destinatario** → CARICO (+ kg).
- **Multy produttore** → SCARICO (– kg).
- **Privati che conferiscono** → CARICO categoria `privato`, tramite la procedura atomica (Sezione 7).
- **Eliminazione conferimento/formulario** → storno compensativo automatico.

---

## 3. TAB **Niyol**

Vista dedicata a Niyol Eticons Logistica (CF `09879800010`, tenant `819c…d813`).
- Elenca solo i FIR in cui Niyol è produttore/destinatario/trasportatore.
- Le giacenze reali di Niyol sono zero (Niyol non ha impianto), ma il **registro generale** viene aggiornato quando Niyol è coinvolta (anche solo come trasportatore, annotazione "Transito come trasportatore").
- Il record FIR resta unico: `firFinalSync` lo replica nei registri dei due tenant senza duplicare i movimenti di magazzino.

---

## 4. TAB **Magazzino Dev** (Dragon Rifiuti 2)

Modulo isolato basato sulle tabelle `dragon_*` (isolamento per `company_id`).
- Movimentazioni normative separate dallo stock fisico.
- Il pulsante rosso "torna indietro" appende sempre `?tab=magazzino-dev`.

---

## 5. TAB **Conto Proprio**

FIR per trasporti in conto proprio Multyproget (Cat. 2‑bis).
- Stessa `DevFormulariList` di Impianto ma filtrata su conto proprio, con le stesse regole della Sezione 1.
- **Non** mostra le intermediazioni: quelle stanno solo nella tab Intermediario dentro Registri.

---

## 6. TAB **Registri**

Tre sotto‑schede (persistite in `?sub=`).

### 6.1 Intermediario
Movimenti `intermediazioni` / `movimenti_intermediario` per la Categoria 8.

### 6.2 Registro Generale
Tabella completa `registro_generale`:
- Filtro **data singola** (calendario) → solo i movimenti del giorno scelto.
- Filtri per tenant, CER, tipo, testo libero.
- **Tasto destro** su una riga → **Esporta selezione in Excel/CSV**.

Pulsanti in testa:
- **➕ Conto Terzi Manuale** → registra un FIR cartaceo portato fisicamente da un cliente: crea `fir_forms` in stato `completato` e richiama `firFinalSync` (registro + giacenze come un FIR digitale).
- **⚙️ Scarico Lavorazione R13** → sposta materiale dai CER dei privati (20xxxx) al CER aziendale (es. 191202 Ferro): genera **due** movimenti sincroni (SCARICO R13 + CARICO).

### 6.3 Invii al RENTRI
- Selettore Registro (Produttore / Intermediazione / Conto Proprio) + data limite.
- **Consolida e Invia RENTRI** → passa dalla Edge Function `rentri-vps-proxy` verso il **bridge** `https://rentri-bridge.dragonrifiuti.space`.
- Se il bridge è offline (timeout/500) → pop‑up con opzione **Simulazione d'Invio (Mock)** per le dimostrazioni.
- In basso: storico con `transaction_id`, data, movimenti consolidati, esito.

⚠️ Chiavi mTLS e JWT stanno sul bridge. **Non toccare** i secrets `SUPABASE_*`, `RENTRI_*`.

---

## 7. TAB **Contatti**

Rubrica clienti/impianti (`anagrafica_aziende_mp`).

**📁 Dettaglio** apre `AnagraficaDettaglioDialog` con quattro schede:
1. **Unità Locali** (`cliente_unita_locali`)
2. **Targhe mezzi** (`cliente_targhe`)
3. **Cantieri** (`cliente_cantieri`)
4. **Autorizzazioni** (`cliente_autorizzazioni`) — numero, data inizio, data scadenza.

Più la sezione **Documenti scansionati** (`cliente_documenti`) su bucket **`documenti_cliente`** (privato, RLS).

I formulari creati da qui seguono le stesse regole della Sezione 1.

---

## 8. TAB **Privati** (DBT)

### 8.1 Nuovo conferimento
- Anagrafica privato (ricerca su `anagrafica_privati` per CF, nome, targa).
- **Data conferimento scegliibile alla creazione e modificabile in seguito.**
- **Multi‑materiale**: un singolo conferimento può contenere **più CER diversi** (righe raggruppate da un `gruppo_id`); la ricevuta li elenca tutti.
- Tendina CER: di default mostra i **materiali realmente movimentati**; con la spunta **"Mostra tutti i CER del catalogo europeo"** accedi a tutti gli 843 codici. La tendina non si chiude mentre scorri.
- Kg pesati per ogni materiale.
- **Metodo di Pagamento** obbligatorio: `contanti` | `tracciabile`.

### 8.2 Garanzia automatica sulle giacenze
Il salvataggio passa dalla RPC **`crea_conferimento_privato_atomico`**, che in un'unica transazione:
1. prende un **lock anti‑concorrenza** sul CER/impianto;
2. crea conferimento, ricevuta e **movimento di magazzino legato al conferimento**;
3. ricalcola il saldo e **verifica** il risultato (`assert_magazzino_giacenza`).

Se il saldo non torna, **l'inserimento fallisce**: non esistono più conferimenti "salvati ma non contabilizzati".
Alla cancellazione di un conferimento vengono eliminati anche ricevuta e carico collegati (storno automatico).

### 8.3 Numerazione e limiti
- Trigger `assign_dbt_progressivo` → **numero progressivo DBT annuale** univoco (`numero_progressivo` + `anno_dbt`).
- Widget **Limiti**: barra per privato verso i **1500 kg/anno** (verde <70%, ambra 70–95%, rosso ≥95%), con **📱 Avviso WhatsApp** (`send-whatsapp`).
- Pulsante **Aggiorna**: ricarica in tempo reale i kg conferiti fino a quel momento.
- Pulsante **Scarica limiti privati (PDF)**: esporta l'elenco completo dei privati con nome, telefono, **kg conferiti**, **kg residui** e **% del limite** alla data dell'aggiornamento.

⚠️ Il limite di 1500 kg è una business rule: non alterarlo.

---

## 9. TAB **Ricevute**

- Una ricevuta per conferimento, **multi‑materiale** (tutti i CER del gruppo con i rispettivi kg).
- Contiene: numero progressivo DBT, data, privato, CER, kg, **metodo di pagamento**.
- La **data è modificabile**: la ricevuta si rigenera di conseguenza.
- PDF intestato "Multyproget S.r.l.".

---

## 10. TAB **Giacenze**

- Elenco per CER con kg attuali e movimenti del periodo.
- La voce **"Saldo iniziale" è stata rimossa**: si legge solo il saldo reale.
- Toggle **"Mostra tutti i CER a magazzino (anche a zero)"** per vedere anche i materiali azzerati.
- Le descrizioni CER mostrano il **materiale reale** (niente più diciture tecniche tipo "rettifica di allineamento").
- Pulsante **Sync giacenze** per il ricalcolo verificato.

---

## 11. TAB **Aree Riservate**

Gestione account impianti terzi (`impianti_accounts`) filtrata sul tenant Multyproget.

---

## 12. TAB **CER Preferiti**

Lista corta dei CER più usati da Multyproget, per la compilazione rapida in tutti i moduli formulario.

---

## 13. TAB **Gestione FIR**

Cruscotto FIR: bozze, inviati, cartacei, cestinati.
- Ricerca per numero, filtri per stato / tenant / periodo, export CSV.
- Da qui puoi riaprire un formulario in vista Standard o Alternativa e cestinarlo (con storno).

---

## 14. TAB **Firma Digitale** e Console RENTRI

- Selezione FIR "completato" → richiesta di firma tramite VPS Universal Signer.
- Se produttore Multy → firma singola. Se Multy destinatario con produttore terzo → **doppia firma**.
- **Console RENTRI**: QR code, sincronizzazione, tab **"Da firmare"** e sezione **"Numeri già assegnati"** (con copia rapida del numero).
- **Alert**: numerino **arancione** sulla campanella quando arrivano formulari da firmare; cliccandolo si apre la console sul tab "Da firmare".

---

## 15. TAB **Fatturazione**

Modulo ERP‑isolato (`fatture`, `fatture_righe`, `noleggi`, `erp_*`).

### 15.1 Nuova Fattura
- Da FIR (`NuovaFatturaDialog`) → valida P.IVA e genera le righe.
- Aliquote da `erp_codici_iva`, conti ricavo da `erp_piano_conti`.
- Stato iniziale **Cortesia** (ambra): modificabile/annullabile entro **24 ore**.

### 15.2 Invio SDI
- Stato **Inviata** (blu): genera l'XML **FatturaPA** (`src/lib/fatturaPA.ts`) in `erp_fatture_xml` e scrive in **`erp_prima_nota`** in partita doppia.
- Da quel momento la fattura è **immutabile** (`fatture_prevent_locked_edit`).

### 15.3 Sibill
- Integrazione **Sibill** per sincronizzazione documenti/controparti, con **modalità Mock** e pagina **Sandbox** per provare tutto senza inviare nulla di reale.

### 15.4 Noleggio Cassoni
- Tabella `noleggi` (`cliente_id`, `cassone_id`, `tariffa_mensile`, `data_registrazione`, `fatturato_stato`).
- Logica retroattiva: nel mese N vedi i noleggi non fatturati del mese N‑1; selezione multipla → fattura unica per cliente.

---

## 16. TAB **Personale** e utenti delle app

La gestione dei login degli autisti è **centralizzata nella dashboard MultyNiyol** (`MNDevDashboardPage`).

Per ogni utente:
- **Crea / Modifica / Elimina accessi** (email/CF/password, default `123stella`), scegliendo se assegnarlo a **Multyproget o Niyol**.
- Il **Codice Fiscale è validato** (16 caratteri, formato reale) e l'autocompletamento del browser è **disattivato** sui campi credenziali: se il dato è errato l'errore è esplicito.
- **Elimina utente** = soft delete (`deactivated_at`) via `admin-user-manage`.
- **Assegna FIR all'app** → scegli quanti numeri assegnare e a quale società.
- **Storico FIR** → dialog con due tab: **Bozze** e **Inviati**.

⚠️ Nessun trigger popola più le app da solo: decidi solo tu (admin/segreteria).

---

## 17. TAB **MUD**

`DevMudExportModule` — esportazione per la dichiarazione MUD annuale.
- Selettore anno (ultimi 6 anni) e 4 card di sintesi (carichi, scarichi, giacenza netta, CER movimentati).
- Tabella riepilogo per CER.
- **Esporta per MUD (Excel)** → `MUD_<Tenant>_<Anno>.xlsx` con 4 fogli: Riepilogo CER, Aggregato Soggetti, Registro Completo, Totali.

---

## 18. TAB **DDT**

`DevDdtModule` — Documenti di Trasporto occasionali.
- Numero automatico `XXXX/YYYY` (`next_ddt_number`), data, cliente destinatario, descrizione bene, targa, causale.
- Azioni **Stampa PDF A4** e **Elimina**; il PDF include intestazione, destinatario, merce e riquadri firme.

---

## 19. Dark Lemon AI

Assistente aziendale con accesso ai dati e alle regole di questa guida.

### 19.1 Le viste disponibili
- **Vista fluttuante**: widget trascinabile e ridimensionabile (icona nell'header).
- **Vista laterale**: pannello agganciato a destra dello schermo.
- **Console RENTRI**: tab "Dark Lemon" dentro la console.
- **Pagina Dark Lemon** dedicata.

### 19.2 Cronologia conversazioni
- Il pulsante **Cronologia** è presente in **tutte** le viste e mostra **tutte** le conversazioni, ovunque siano nate.
- Ogni conversazione ha un'**etichetta di origine**: *Vista laterale*, *Vista fluttuante*, *Console RENTRI*, *Pagina Dark Lemon*.
- Ogni conversazione si **elimina singolarmente** con l'icona cestino (con conferma): vengono cancellati sia la conversazione sia i suoi messaggi.
- **Nuova Chat** apre una conversazione vuota senza toccare lo storico.

### 19.3 Capacità
- **Screenshot** (pulsante 📸) dal pannello laterale e dal widget: cattura compressa, con timeout di sicurezza, che esclude il pannello AI. Se fallisce, l'AI analizza comunque la pagina come **testo**.
- Con un'immagine allegata passa automaticamente a un **modello con visione**: legge screenshot, foto di formulari cartacei e documenti.
- **🔍 Analizza pagina** legge il contenuto della schermata attiva.
- **Form Bridge**: può compilare i campi del formulario visibile.

---

## 20. Sincronizzazioni e regole invarianti

- `firFinalSync.ts` è l'unico punto che aggiorna registro + giacenze da FIR **completato**.
- Trigger e funzioni DB da **non** toccare:
  - `crea_conferimento_privato_atomico`, `assert_magazzino_giacenza`, `recalculate_magazzino_giacenza`
  - `trg_sync_privati_conferimento_to_inventory`
  - `guard_and_reserve_fir_on_insert`
  - `link_pool_row_after_fir_insert`
  - `auto_release_on_soft_delete`
  - `fir_forms_lock_numero_fir`
  - `fatture_prevent_locked_edit`
  - `assign_dbt_progressivo`
- **RLS**: ogni tabella è isolata per `tenant_id` (`get_user_tenant`, `is_multy_niyol_admin`, `is_allowed_multy_niyol_tenant`).
- Cancellazioni: **soft delete** ovunque (`deleted_by_user`, `deactivated_at`). Nessun DELETE fisico, salvo gli storni tecnici collegati ai conferimenti privati.

---

## 21. Troubleshooting rapido

| Sintomo | Causa probabile | Fix operativo |
|---|---|---|
| Giacenza non aggiornata dopo un FIR | Multy non è né produttore né destinatario | Corretto: la giacenza cambia solo se Multy è parte del formulario. |
| Giacenza non aggiornata dopo un privato | Salvataggio interrotto | Non può succedere: la procedura atomica fallisce e avvisa. Usa **Sync giacenze** per riverificare. |
| Riga FIR gialla | Manca `peso_destino` su FIR completato | Apri il FIR, compila la quantità arrivo, salva. |
| "Numero FIR già utilizzato" | Numero duplicato nello stesso tenant | Cambia numero o cestina il duplicato. |
| Non trovo un CER nella tendina | Filtro sui soli materiali movimentati | Spunta "Mostra tutti i CER del catalogo europeo". |
| Bridge RENTRI offline | Proxy giù o WAF ban 423 | Usa la **Simulazione (Mock)** oppure attendi 30' e riprova. |
| Ricevuta con data errata | Data conferimento sbagliata | Modifica la data nel Privato → la ricevuta si rigenera. |
| App autista mostra un FIR "misterioso" | Assegnazione manuale precedente | Personale → Storico FIR → Bozze → cestina. |
| Errore creando un utente app | CF non valido o autofill del browser | Ricontrolla il Codice Fiscale (16 caratteri) e riscrivilo a mano. |

---

## 22. Ambienti coinvolti

- **Frontend**: React 18 + Vite, `@/lib/supabaseClient` (client custom).
- **Backend**: Lovable Cloud (Supabase) + Edge Functions Deno.
- **Edge Functions chiave**: `admin-user-manage`, `import-elisabetta`, `send-whatsapp`, `send-email`, `rentri-vps-proxy`, `rentri-action-proxy`, `dark-lemon-mn`, `sibill-integration`.
- **Storage**: `documenti_cliente` (privato), `fir-documents` (pubblico QR RENTRI), `avatars`.

---

## 22-bis. Formato FIR, coda reinvio RENTRI e CER in fattura

- **Formato FIR**: selettore "Formato del formulario" (digitale / cartaceo) presente sia nel Modulo Standard (`MNFIRFormComplete`) sia nel Modulo Alternativo (`FIRAlternativeForm`). Con "cartaceo" le azioni di invio/firma RENTRI sono disabilitate; il selettore mostra i giorni residui rispetto alla scadenza del **15 settembre 2026**. Valore salvato in `form_data.formato_fir`.
- **Coda "In attesa di reinvio a RENTRI"**: se l'invio fallisce per indisponibilità dei servizi RENTRI, il FIR resta in bozza con `form_data.rentri_retry_pending = true`. Nella Console RENTRI il pannello ambra elenca i formulari in attesa e consente "Reinvia tutti" (nessun job automatico).
- **CER obbligatorio in fattura**: `NuovaFatturaDialog` blocca il salvataggio se una riga di smaltimento/trasporto non ha un CER valido (`src/lib/cerValidation.ts`, catalogo europeo). Le righe di noleggio sono esenti.

---

## 23. Cosa non fare mai

1. Non riattivare l'assegnazione automatica dei numeri FIR: sempre manuale (workspace o Centro App & FIR).
2. Non riscrivere `firFinalSync.ts` né modificare le colonne di `fir_forms`.
3. Non bypassare `crea_conferimento_privato_atomico` per inserire conferimenti privati.
4. Non eliminare fisicamente record: soft delete sempre.
5. Non toccare RLS/policies o funzioni `SECURITY DEFINER` senza valutare l'impatto sui trigger dipendenti.
6. Non cambiare i tenant UUID: Multyproget `77ec9a3d‑602e‑438f‑97bf‑1c69abd8f691`, Niyol `819c783e‑78dd‑4080‑8265‑802e75b0d813`.
7. Non introdurre librerie AI diverse da OpenRouter (regola progetto).

---

Fine guida. Per aggiornamenti: modifica questo file (`public/guida-dev-multy.md`, copia in `docs/GUIDA_DEV_MULTY.md`) **integrando le novità nelle sezioni esistenti**, senza creare capitoli separati.
