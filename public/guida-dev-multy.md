# 📘 Guida Completa — Dev Multy (Multyproget · Centro di Comando)

> Documento operativo. Chi lo legge deve poter usare Dev Multy dal primo click all'ultimo, senza esperienza pregressa.
> **Ultimo aggiornamento: 18 agosto 2026.** Le novità più recenti sono raccolte nella **Sezione 21 — Novità**: in caso di dubbio, la Sezione 21 prevale su tutto il resto del documento.

---

## 0. Accesso

- URL: `/mn/admin/dev-multyproget`
- Accesso riservato agli admin whitelistati Multyniyol.
- Ogni tab è persistita in URL (`?tab=impianto`, `?tab=registri&sub=generale`). Ricaricando o condividendo il link, si torna esattamente dove eri.
- Bottone in alto **"Modulo Alternativo FIR"** → apre la vista sperimentale del formulario. È un'alternativa grafica al modulo standard: **gli stessi dati vengono scritti sullo stesso record `fir_forms`**, quindi puoi passare da una vista all'altra senza duplicare nulla.

Legenda colori delle tab:
- 🟢 Verde = area Multyproget (Impianto, Registri, Privati, ecc.)
- 🔵 Ciano = Niyol
- 🔴 Rosso = Magazzino Dev (Dragon Rifiuti 2)
- 🟠 Ambra = allerta / MUD / CER preferiti
- 🟣 Viola = firma digitale / invii RENTRI
- 🟡 Giallo = Personale

---

## 1. TAB **Impianto**

Modulo storico dell'impianto Multyproget (via Rivarossa 18/20).

### 1.1 Cosa vedi
- Elenco movimenti impianto (`movimenti_impianto`) filtrabili per data, CER, tipo (CARICO/SCARICO), ruolo (PRODUTTORE/DESTINATARIO).
- Widget giacenze aggregate.
- Elenco formulari dell'impianto (`DevFormulariList`) con:
  - CER, produttore, destinatario, trasportatore, **quantità partenza / quantità arrivo**.
  - Riga colorata in **giallo/ambra** se il formulario è `completato` ma manca `peso_destino` (regola visiva Prompt 5).
  - Pulsanti fine riga: **Standard** (apre `MNFIRFormComplete`), **Alternativo** (apre `FIRAlternativeForm`), **Duplica**, **🗑 Cestino** (soft delete `deleted_by_user=true`).

### 1.2 Regole giacenze (tassative)
Le giacenze si aggiornano **solo** se Multyproget è produttore o destinatario. Se Multy è solo trasportatore → nessun impatto su `magazzino_giacenze`.

- **Multy destinatario** → CARICO su `magazzino_giacenze` (+ kg).
- **Multy produttore** → SCARICO (– kg).
- **Privati che conferiscono** → trigger `trg_sync_privati_conferimento_to_inventory` (CARICO, categoria `privato`).
- **Eliminazione conferimento privato** → trigger `trg_reverse_privati_conferimento_on_delete` compensa in negativo.

### 1.3 Come creare / modificare un FIR dall'impianto
1. Dal `DevFirWorkspace` in alto della tab, digita il numero FIR (formato RENTRI o cartaceo) e clicca **Crea formulario**.
2. Si apre subito la bozza. Scegli il modulo (Standard o Alternativo) — puoi cambiarlo in qualsiasi momento.
3. Compila e clicca **Salva bozza** oppure **Salva definitivo** (→ stato `completato`).
4. Se salvi definitivo, parte `syncFirFinalToRegistryAndInventory` (`src/lib/firFinalSync.ts`):
   - scrive in `registro_generale` per **ogni** tenant coinvolto (Multy e/o Niyol) in base al Codice Fiscale;
   - se Multy è produttore o destinatario, aggiorna anche `movimenti_impianto` (con `origine='fir_final'`, idempotente su `fir_id`).

⚠️ **Non modificare `firFinalSync.ts`.** È il cuore della sincronizzazione, già tarato per la doppia contabilità Multy/Niyol.

### 1.4 Reset "pulsante gomma"
Ogni sezione del modulo (Produttore, Destinatario, Trasportatore, Rifiuto, Quantità, Trasporto) ha un'icona 🧽 **Cancella sezione** che azzera i soli campi di quella sezione, lasciando intatte le altre.

---

## 2. TAB **Niyol**

Vista dedicata a Niyol Eticons Logistica (CF `09879800010`, tenant `819c…d813`).
- Elenca solo i FIR in cui Niyol è produttore/destinatario/trasportatore.
- Le giacenze reali di Niyol sono zero (Niyol non ha impianto), ma il **registro generale** viene aggiornato quando Niyol è coinvolta (anche solo come trasportatore, con annotazione "Transito come trasportatore").

Regola operativa: Niyol lavora quasi sempre per conto di Multyproget. Il record FIR è unico, `firFinalSync` lo replica in entrambi i registri automaticamente.

---

## 3. TAB **Magazzino Dev** (Dragon Rifiuti 2)

Modulo isolato basato su `dragon_*` tables (`company_id`). Vedi `docs/summary.md` per l'architettura Dragon.
- Movimentazioni normative separate dallo stock fisico (Prompt Dragon).
- Bottone rosso "torna indietro" appende sempre `?tab=magazzino-dev`.

---

## 4. TAB **Conto Proprio**

FIR per trasporti in conto proprio Multyproget (Cat. 2‑bis).
- Stessa `DevFormulariList` di Impianto ma filtrata su conto proprio.
- **Non** mostra le intermediazioni (bug corretto): quelle sono solo nella tab Intermediario dentro Registri.

---

## 5. TAB **Registri**

Contiene tre sotto‑schede (persistite in `?sub=`):

### 5.1 Intermediario
Elenca movimenti `intermediazioni` / `movimenti_intermediario` per Category 8 (Multyproget intermediario).

### 5.2 Registro Generale
Tabella completa `registro_generale` con:
- Filtro **data singola** (calendario) → mostra solo i movimenti del giorno scelto.
- Filtri per tenant, CER, tipo, testo libero.
- **Menu tasto destro** su una riga → **Esporta selezione in Excel/CSV**.

Pulsanti in testa:
- **➕ Conto Terzi Manuale** (`ContoTerziManualDialog`) → registra un FIR cartaceo portato fisicamente da un cliente. Al salvataggio crea `fir_forms` in stato `completato` e richiama `firFinalSync` → `registro_generale` + `magazzino_giacenze` aggiornati come se fosse un FIR digitale.
- **⚙️ Scarico Lavorazione R13** (`ScaricoLavorazioneDialog`) → sposta materiale dai CER dei privati (20xxxx) al CER aziendale (es. 191202 Ferro). Genera **due** movimenti sincroni: SCARICO R13 sul CER privato + CARICO sul CER aziendale.

### 5.3 Invii al RENTRI
- Selettore Registro (Produttore / Intermediazione / Conto Proprio) + data limite.
- **Consolida e Invia RENTRI** → chiama `rentri-action-proxy`.
- Se la VPS è offline (timeout/500) → pop‑up "Server VPS RENTRI non raggiungibile" con opzione **Simulazione d'Invio (Mock)** che genera esito positivo fittizio per dimostrazioni.
- In basso: tabella storico con `transaction_id`, data, movimenti consolidati, esito.

⚠️ Le chiavi mTLS e le impostazioni JWT stanno sul backend VPS. **Non toccare** i secrets `SUPABASE_*`, `RENTRI_*`.

---

## 6. TAB **Contatti**

Rubrica completa clienti/impianti (`anagrafica_aziende_mp`, 41 colonne).

Cliccando su **📁 Dettaglio** di un cliente si apre `AnagraficaDettaglioDialog` con quattro schede:
1. **Unità Locali** (`cliente_unita_locali`)
2. **Targhe mezzi** (`cliente_targhe`)
3. **Cantieri** (`cliente_cantieri`)
4. **Autorizzazioni** (`cliente_autorizzazioni`) — con Numero, Data inizio, Data scadenza.

E una sezione **Documenti scansionati** (`cliente_documenti`) che carica PDF/immagini sul bucket **`documenti_cliente`** (privato, RLS).

---

## 7. TAB **Privati** (DBT)

Modulo conferimenti privati.

### 7.1 Nuovo conferimento
- Anagrafica privato (ricerca su `anagrafica_privati` per CF, nome, targa).
- Data conferimento (**modificabile** anche dopo la creazione).
- CER: solo codici 20xxxx (auto‑classificati come privato).
- Kg pesati.
- **Metodo di Pagamento** (obbligatorio): `contanti` | `tracciabile`.
- Al salvataggio:
  - Trigger `assign_dbt_progressivo` assegna **numero progressivo DBT annuale** univoco (`numero_progressivo` + `anno_dbt`).
  - Trigger inventario aggiorna `magazzino_giacenze` (privato).

### 7.2 Widget Limiti (`PrivatiLimitiWidget`)
- Barra per ogni privato con progressione verso i **1500 kg/anno**.
- Colore verde <70%, ambra 70–95%, rosso ≥95%.
- Bottone **📱 Avviso WhatsApp** → chiama la Edge Function `send-whatsapp` (Meta Cloud API, fallback `wa.me`).

⚠️ Il limite 1500 kg è hardcoded nella business rule. Non alterarlo.

---

## 8. TAB **Ricevute**

PDF di ricevuta per ogni conferimento privato.
- Include: numero progressivo DBT, data, privato, CER, kg, **metodo di pagamento**.
- Editabile: puoi modificare la **data** anche dopo l'emissione.
- PDF firmato "Multyproget S.r.l." con dati anagrafici azienda.

---

## 9. TAB **Aree Riservate**

Gestione account impianti terzi (`impianti_accounts`) filtrata sul tenant Multyproget.

---

## 10. TAB **CER Preferiti**

Lista corta dei CER più usati da Multyproget, per compilazione rapida in tutti i moduli formulario.

---

## 11. TAB **Gestione FIR**

Cruscotto FIR: bozze, inviati, cartacei, cestinati.
- Ricerca per numero.
- Filtri per stato / tenant / periodo.
- Export CSV.

---

## 12. TAB **Firma Digitale**

Firma automatica RENTRI tramite VPS Universal Signer.
- Selezione FIR "completato" → richiesta di firma.
- Se produttore Multy → firma singola.
- Se Multy destinatario e produttore terzo → **doppia firma** (regola Alt Signing).

---

## 13. TAB **Fatturazione**

Modulo ERP‑isolato (`fatture`, `fatture_righe`, `noleggi`, `erp_*`).

### 13.1 Nuova Fattura
- Da FIR (`NuovaFatturaDialog`) → valida P.IVA, genera righe.
- Righe: aliquote da `erp_codici_iva`, conti ricavo da `erp_piano_conti`.
- Stato iniziale: **Cortesia** (ambra). Fino a **24 ore** puoi modificare/annullare.

### 13.2 Invio SDI
- Cambio stato → **Inviata** (blu):
  - genera XML FatturaPA (`src/lib/fatturaPA.ts`) e salva in `erp_fatture_xml`;
  - scrive automaticamente in **`erp_prima_nota`** in partita doppia (causale da `erp_causali_contabili`).
- Da questo momento la fattura è **immutabile** (trigger `fatture_prevent_locked_edit`).

### 13.3 Noleggio Cassoni (tab interna)
- Tabella `noleggi`: `cliente_id`, `cassone_id`, `tariffa_mensile`, `data_registrazione`, `fatturato_stato`.
- Logica retroattiva: nel mese N vedi solo i noleggi non fatturati del mese N‑1. Selezioni multiple → genera fattura unica per cliente.

---

## 14. TAB **Personale**

- Elenco 17 dipendenti (dashboard centrale gestita dal super admin in `MNDevDashboardPage`).
- Per ogni utente:
  - **Modifica accessi** (email/CF/password, default `123stella`).
  - **Elimina utente** (soft delete `deactivated_at` via `admin-user-manage`).
  - **Assegna FIR all'app** → scegli quanti numeri assegnare e **se assegnarli come Multyproget o Niyol**. La app del ragazzo mostrerà i FIR solo in questo caso.
  - **Storico FIR** → dialog con due tab: **Bozze** (in lavorazione) e **Inviati** (completati/vidimati).

⚠️ **Assegnazione FIR automatica DISATTIVATA**: nessun trigger popola più le app da solo. Solo tu (admin/segretaria) decidi.

---

## 15. TAB **MUD**

`DevMudExportModule` — esportazione dati per dichiarazione MUD annuale.

- Selettore anno (ultimi 6 anni).
- 4 card di sintesi: totale carichi, totale scarichi, giacenza netta, CER movimentati.
- Tabella riepilogo per CER (kg carichi / kg scarichi / netto).
- Bottone **Esporta per MUD (Excel)** → produce `MUD_<Tenant>_<Anno>.xlsx` con 4 fogli:
  1. **Riepilogo CER**
  2. **Aggregato Soggetti** (produttore / destinatario / trasportatore con CF/P.IVA)
  3. **Registro Completo** (dump `registro_generale` del periodo)
  4. **Totali**

Da consegnare così com'è al tecnico incaricato del MUD.

---

## 16. TAB **DDT**

`DevDdtModule` — Documenti di Trasporto occasionali (cassoni vuoti tra siti, spostamenti interni).

- Nuovo DDT: numero automatico `XXXX/YYYY` (funzione `next_ddt_number`), data, cliente destinatario, descrizione bene, targa mezzo, causale trasporto.
- Elenco DDT con azioni **Stampa PDF A4** e **Elimina**.
- PDF include intestazione Multyproget, blocco destinatario, dettagli merce e riquadri firme mittente/vettore/destinatario.

---

## 17. Sincronizzazioni e regole invarianti

- `firFinalSync.ts` è l'unico punto che aggiorna registro + giacenze da FIR **completato**.
- Trigger DB attivi che **non** vanno toccati:
  - `trg_sync_privati_conferimento_to_inventory`
  - `trg_reverse_privati_conferimento_on_delete`
  - `guard_and_reserve_fir_on_insert`
  - `link_pool_row_after_fir_insert`
  - `auto_release_on_soft_delete`
  - `fir_forms_lock_numero_fir`
  - `fatture_prevent_locked_edit`
  - `assign_dbt_progressivo`
- **RLS**: ogni tabella è isolata per `tenant_id`. Le funzioni `get_user_tenant`, `is_multy_niyol_admin`, `is_allowed_multy_niyol_tenant` sanciscono la visibilità.
- Cancellazioni: **soft delete** ovunque (`deleted_by_user`, `deactivated_at`). Nessun DELETE fisico.

---

## 18. Troubleshooting rapido

| Sintomo | Causa probabile | Fix operativo |
|---|---|---|
| Giacenza non aggiornata dopo un FIR | Multy non è né produttore né destinatario del FIR | Corretto: la giacenza cambia solo se Multy è coinvolta come parte. |
| Riga FIR gialla | Manca `peso_destino` su FIR completato | Apri il FIR, compila la quantità arrivo, salva. |
| "Numero FIR già utilizzato" | Numero duplicato nello stesso tenant | Cambia numero o cestina il duplicato. |
| VPS RENTRI offline | Server proxy giù o WAF ban 423 | Usa la **Simulazione (Mock)** oppure attendi 30' e riprova. |
| Ricevuta con data errata | Data conferimento sbagliata | Modifica la data nel Privato → la ricevuta si rigenera. |
| App ragazzo mostra un FIR "misterioso" | Assegnazione manuale precedente | Vai in Personale → Storico FIR → Bozze → cestina. |

---

## 19. Ambienti coinvolti

- **Frontend**: React 18 + Vite, `@/lib/supabaseClient` (client custom).
- **Backend**: Lovable Cloud (Supabase) + Edge Functions Deno.
- **Edge Functions chiave**: `admin-user-manage`, `import-elisabetta`, `send-whatsapp`, `send-email`, `rentri-vps-proxy`, `rentri-action-proxy`.
- **Storage**: `documenti_cliente` (privato), `fir-documents` (pubblico QR RENTRI), `avatars`, ecc.

---

## 20. Cosa non fare mai

1. Non riassegnare numeri FIR automaticamente. Sempre manualmente da Personale.
2. Non riscrivere `firFinalSync.ts` né modificare le colonne di `fir_forms`.
3. Non eliminare fisicamente record: soft delete sempre.
4. Non toccare RLS/policies o funzioni `SECURITY DEFINER` senza pianificarne l'impatto sui trigger dipendenti.
5. Non cambiare i tenant UUID: Multyproget `77ec9a3d‑602e‑438f‑97bf‑1c69abd8f691`, Niyol `819c783e‑78dd‑4080‑8265‑802e75b0d813`.
6. Non introdurre librerie AI diverse da OpenRouter (regola progetto).

---

## 21. 🆕 Novità (aggiornato al 18 agosto 2026)

> Questa sezione prevale sulle precedenti dove ci fosse contraddizione.

### 21.1 Numeri FIR: solo manuali
- L'assegnazione **automatica** dei numeri FIR è stata **disattivata** (rimossi i trigger di auto-assegnazione).
- Un formulario si crea in due modi: digitando il numero a mano ("Crea formulario") oppure assegnando un numero dal **Centro App & FIR**.
- Nel Centro App & FIR puoi: assegnare **più numeri** allo stesso autista (chip multipli), contrassegnare un numero come **"Assegnato all'ufficio"** (lo usa direttamente l'admin) e **copiare** il numero con un click.
- Le app degli autisti non partono più con un FIR precaricato: mostrano l'elenco dei FIR che gli hai assegnato.

### 21.2 Modulo Standard e Modulo Alternativo
- Ogni formulario è creabile e modificabile in **entrambe** le viste; sono **sincronizzate in tempo reale**: quello che scrivi in una compare nell'altra.
- Ogni bozza si elimina con l'icona **cestino** (soft delete): registro e giacenze vengono **stornati automaticamente**.
- Questa regola vale ovunque si facciano formulari: Impianto, Conto Proprio, Contatti, Niyol, workspace FIR, bozze RENTRI.
- Pulsante **gomma "Cancella sezione"** per svuotare rapidamente un blocco del formulario.

### 21.3 Fatturazione dai formulari
- Il blocco "Crea fattura da questo formulario" appare **solo nei formulari compilati da ufficio/admin**. Nelle app degli autisti non c'è.

### 21.4 Giacenze: garanzia automatica
- I conferimenti privati passano dalla procedura **atomica** `crea_conferimento_privato_atomico`: lock anti-concorrenza, movimento di magazzino legato al conferimento e **verifica finale del saldo**. Se il saldo non torna, l'inserimento fallisce: non esistono più conferimenti "salvati ma non contabilizzati".
- I formulari aggiornano le giacenze **solo se Multyproget è produttore o destinatario** (regola corretta, non è un bug).
- Anche i formulari salvati **in bozza** riportano le giacenze al valore di partenza.
- Il pulsante **Sync giacenze** nei movimenti è operativo (permessi corretti).
- La voce **"Saldo iniziale"** è stata rimossa dalle giacenze.
- Eliminando un conferimento vengono eliminate anche la ricevuta collegata e il relativo carico.

### 21.5 Privati, ricevute e CER
- **Multi-materiale**: un conferimento/ricevuta può contenere più CER diversi (raggruppati).
- La **data** del conferimento e della ricevuta è modificabile; la ricevuta si rigenera di conseguenza.
- Nella tendina CER vedi di default solo i **materiali realmente movimentati**; con la spunta **"Mostra tutti i CER del catalogo europeo"** accedi a tutti gli 843 codici. La tendina non si chiude più mentre scorri.
- In Giacenze c'è il toggle **"Mostra tutti i CER a magazzino (anche a zero)"**.
- Le descrizioni CER mostrano il materiale reale (niente più diciture tecniche tipo "rettifica di allineamento").

### 21.6 Utenti delle app (Multyproget e Niyol)
- Login degli autisti: si **creano, modificano ed eliminano dalla dashboard MultyNiyol**, scegliendo se assegnarli a Multyproget o a Niyol.
- Il **Codice Fiscale** è validato (16 caratteri, formato reale) e l'autocompletamento del browser è disattivato: se il campo è errato, l'errore ora è esplicito.

### 21.7 RENTRI
- Canale unico verso il **bridge** `https://rentri-bridge.dragonrifiuti.space` tramite la Edge Function `rentri-vps-proxy`.
- **Console RENTRI**: QR code, sincronizzazione, tab **"Da firmare"** e sezione **"Numeri già assegnati"**.
- **Alert**: pallino/numerino **arancione** sulla campanella quando arrivano formulari da firmare; cliccandolo si apre la console sul tab "Da firmare".

### 21.8 Fatturazione, Sibill e Noleggio
- Integrazione **Sibill** con **modalità Mock** e pagina **Sandbox** per provare tutto senza inviare nulla di reale.
- XML **FatturaPA** per l'invio SDI, modulo **Noleggio Cassoni**, esportazioni **MUD** e **DDT**.

### 21.9 Dark Lemon AI
- **Screenshot funzionante** dal pannello laterale e dal widget flottante (pulsante 📸): la cattura è compressa, ha un timeout di sicurezza ed esclude il pannello AI.
- Quando invii un'immagine, l'AI passa automaticamente a un **modello con visione**: legge screenshot, foto di formulari cartacei e documenti.
- Se la cattura fallisce, l'AI analizza comunque la pagina come **testo** invece di bloccarsi.
- Dark Lemon può **compilare i form** visibili (Form Bridge) e conosce tutte le regole di questa guida.

---

Fine guida. Per aggiornamenti: modifica questo file (`public/guida-dev-multy.md`, copia in `docs/GUIDA_DEV_MULTY.md`) mantenendo la numerazione delle sezioni.
