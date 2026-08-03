# Analisi comparativa — Prometeo Rifiuti vs. Piattaforma Multyproget / Niyol

Documento di gap analysis su tutte le 8 aree funzionali del capitolato Prometeo, confrontate con quanto oggi realmente presente nel codice e nel database della piattaforma.

Legenda stato:
- **OK** — funzione presente e operativa
- **PARZIALE** — esiste una base, mancano pezzi
- **ASSENTE** — da costruire da zero

---

## 1. Architettura dei dati e configurazione di base

### Presente (OK)
- **Anagrafica aziende** — tabella `anagrafica_aziende_mp` con ricerca live per ragione sociale / P.IVA / CF, usata dai selettori Produttore, Destinatario e Trasportatore del formulario.
- **Anagrafica privati** — `anagrafica_privati` con indirizzo, CAP, comune, provincia, targa e modello automezzo, limiti annuali (`limiti_privati`), documenti (`documenti_privati`).
- **Unità locali e cantieri** — `cliente_unita_locali`, `cliente_cantieri`.
- **Autorizzazioni** — `cliente_autorizzazioni` + preset autorizzazioni Multyproget (`src/data/multyPresets.ts`, `PresetAziendaSelector`) con tipologia, numero e data.
- **Targhe** — `cliente_targhe`.
- **Documenti e scadenziario** — `cliente_documenti` con alert di scadenza.
- **CER preferiti** — modulo `DevCERPreferitiModule`.
- **Utenti e permessi** — `profiles`, `user_roles`, `memberships`, gestione accessi ragazzi app dalla dashboard MultyNiyol.
- **Giacenze iniziali / pregresso** — caricamento manuale da Magazzino e import massivo (`import-elisabetta`).

### Parziale
- **Inserimento massivo CER preferiti** — oggi si aggiungono uno a uno.
- **Abbinamento CER ↔ singola anagrafica** — i CER non sono vincolati per cliente/destinatario.
- **Analisi chimiche e schede di caratterizzazione** — esiste solo l'archivio documentale generico, non l'entità analisi con validità e associazione al CER.
- **Carrozzerie mobili** sulle autorizzazioni trasportatore — non modellate.
- **Vidimazione registro cartaceo** — stampa registro sì, gestione fogli da vidimare no.

### Assente
- **Fusione/deduplica anagrafiche doppie** (merge con ricucitura dei movimenti).
- **Storico variazioni anagrafiche della propria azienda nel tempo** (versionamento con validità temporale).

---

## 2. Profilazione utente e ruoli

### Presente (OK)
- Multi-tenancy reale Multyproget / Niyol con isolamento per `tenant_id` e RLS.
- Profilo **Produttore** (Conto Proprio), **Trasportatore conto terzi** (app autisti, targhe, Albo), **Destinatario/Impianto** (accettazione, R/D, stoccaggio), **Intermediario** (`intermediari`, `intermediazioni`, `movimenti_intermediario`, listini).
- Ruoli admin/segretaria vs. autista con viste separate.

### Assente
- **Profilo Consulente multi-azienda** (escluso su tua indicazione).
- **Profilo Spurghista / microraccolta** (flussi multi-produttore su unico viaggio).

---

## 3. Movimenti, registro carico/scarico e FIR

### Presente (OK)
- Doppia vista formulario **Standard** e **Alternativo**, sincronizzate in tempo reale.
- Creazione, modifica, bozze, eliminazione con **ripristino automatico delle giacenze** (`firFinalSync.ts` + `revertFirFromRegistryAndInventory`).
- Aggiornamento automatico di `registro_generale`, `movimenti_impianto` e `magazzino_giacenze` su salvataggio bozza.
- Riconoscimento del ruolo Multyproget (produttore/destinatario) per decidere CARICO / SCARICO.
- FIR Niyol che coinvolgono Multy aggiornano anche Multy senza duplicazioni.
- Logo e layout di stampa con pagina A4 timbri e firme.
- Generazione massiva formulari vidimati e duplicazione rapida.
- Peso partenza e peso destino con **alert ambra** su peso destino mancante.
- Registro generale con filtro giornaliero, inserimento manuale conto terzi cartaceo, scarico lavorazione R13, export Excel/PDF.
- Limiti privati 1500 kg con blocco.
- Tracciabilità Dragon (allocazioni FIFO carico↔scarico).

### Parziale
- **Ordine cronologico forzato** sull'inserimento di movimenti dimenticati: la data è editabile ma non c'è il controllo bloccante di coerenza cronologica del registro.
- **Rettifica CER/quantità su registrazione già effettuata**: si modifica il record, manca il movimento compensativo tracciato come rettifica.
- **Recupero FIR cancellati per errore**: i soft-delete esistono, manca il cestino con ripristino da interfaccia.
- **Limiti di deposito temporaneo / stoccaggio autorizzato**: esistono i limiti privati e magazzino, manca il controllo normativo su volumi e tempi per CER.
- **Campi obbligatori configurabili prima di stampa/salvataggio**: validazioni fisse, non configurabili.
- **Campi personalizzati sul FIR**: il template alternativo li supporta, lo standard no.

### Assente
- **Scarico di trasferimento** tra unità locali/aree.
- **Stampa giacenze a data storica** (oggi solo giacenza attuale).
- **Carico respinto** totale o parziale con relativo FIR di reso.
- **Sosta tecnica**, **trasbordo**, **trasporto intermodale**.
- **Trasporto transfrontaliero e Allegato VII**.
- **Più intermediari sul singolo FIR**.

---

## 4. Modulo RENTRI

### Presente (OK)
- Struttura completa di invio: `rentri-vps-proxy`, `rentri-action-proxy`, `rentri-get-pdf`, `rentri-refresh-media`, `rentri_logs`, `fir_digitali`, pool numeri (`fir_number_pool`).
- Mapper payload FIR → RENTRI (`rentriFormMapper.ts`), emissione, firma ricezione, richiesta vidimazione, download PDF/QR.
- Padding a 6 cifre dei progressivi, codici blocco, gestione ban WAF 423.
- Pannello RENTRI in Super Admin e console admin con 11 azioni.
- Assegnazione manuale dei numeri FIR (serbatoi automatici disattivati come richiesto).

### Da rifare / bloccato
- **Certificato di interoperabilità e mTLS**: oggi dipendono dalla VPS eliminata. Va reimplementato — o su nuova VPS o nativo in Edge Function. Tutto il resto del modulo è già pronto ad agganciarsi.

### Assente
- **Invio telematico del registro carico/scarico** al RENTRI (oggi si invia il FIR, non le registrazioni di registro).
- **Conservazione digitale a norma**.
- **Rettifica di registrazione già protocollata**.
- **Gestione MPS nel flusso RENTRI**, **stoccaggio istantaneo sincronizzato**.
- **Campo "Provenienza rifiuto RENTRI"** e **"Tipo Formulario"** nelle anagrafiche.
- **Stampa FIR in bianco** dal pannello RENTRI e **procedura di degrado a cartaceo** (parzialmente coperta dall'editor stampa manuale).

---

## 5. Logistica avanzata

### Presente (OK)
- **DDT** — `ddt_forms` + `DevDdtModule`.
- **Beni a noleggio** — `noleggi` con fatturazione retroattiva mese precedente e FatturaPA.
- **GPS flotta e conducenti** — tracciamento posizioni, `driver_locations`.
- **Magazzino multi-deposito** — `magazzino_deposito`, `magazzino_giacenze`, warehouse Dragon.

### Assente
- **Modulo Pesa** (interfaccia bilance/pesa a ponte).
- **Magazzino MPS / End Of Waste** come flusso separato dal rifiuto.
- **Gestione lotti** di produzione/stoccaggio.
- **Pianificazione servizi e giri di raccolta**.
- **Manutenzione beni e contenitori**.

---

## 6. Fatturazione e gestione commerciale

### Presente (OK)
- Modulo Fatturazione isolato (`fatture`, `fatture_righe`) con XML FatturaPA e PDF.
- ERP contabile: `erp_prima_nota`, `erp_piano_conti`, `erp_codici_iva`, `erp_metodi_pagamento`, `erp_fatture_vendita`, `erp_fatture_xml`, registrazione automatica in Prima Nota.
- Listini intermediazione.
- Pagamenti privati e ricevute con metodo di pagamento contanti/tracciabile e numerazione progressiva annuale.

### Assente
- **Preventivi e contratti**.
- **Aggiornamento massivo prezzi** su contratti e su formulari pre-fatturazione.
- **Note di credito**.
- **Ri.Ba.** e flussi bancari.
- **Fidi, impegni di spesa e blocco servizi al superamento soglia**.
- **Analisi clienti dormienti** (nessun movimento nel periodo).

---

## 7. Comunicazioni agli enti (MUD, ORSO, SEVESO)

### Presente (PARZIALE)
- `DevMudExportModule`: aggregazione dati per anno ed export Excel per il tecnico.

### Assente
- Tracciato MUD ufficiale per profilo **Produttore / Trasportatore / Intermediario / Destinatario-Multiattività**.
- Export **.000 Ecocerved** e import nel software ministeriale.
- **MudComuni** e **MudTelematico**.
- **Simulazione MUD** anticipata e quadratura.
- **Allineamento pesi partenza/destino** per il MUD.
- **Accorpamento MUD** multi-azienda, **archivio storico spedizioni**, **statistiche MUD**, utility **"Imposta urbano"**.
- **ORSO 3.0** e **SEVESO**.

---

## 8. Automazione e connettività esterna

### Presente (OK)
- **Invio documenti automatico** via email (`send-email`, `send-global-email`), SMS, WhatsApp verso i contatti anagrafici.
- **AI Dark Lemon** con tool operativi su schema Dragon e RENTRI, analisi contesto pagina, autonomia nel provisioning dati — vantaggio competitivo assente in Prometeo.
- **OCR formulari** (`ocr-formulario`) — assente in Prometeo.
- **Telefonia VoIP integrata**, social interno, messaggistica.
- **Ambiente demo** in Super Admin (`is_demo`).
- Aggiornamenti software continui (deploy).

### Assente
- **Generazione automatica del registro per conto terzi** (registro dei clienti produttori gestiti).
- **Integrazione Albo Nazionale Gestori Ambientali** (verifica iscrizione, categorie, portate).

---

## Sintesi

Copertura stimata sul capitolato Prometeo:

- Area 1 Anagrafiche: **~70%**
- Area 2 Ruoli: **~75%** (escluso Consulente)
- Area 3 FIR e movimenti: **~65%**
- Area 4 RENTRI: **~50%** (infrastruttura pronta, connessione da ricostruire)
- Area 5 Logistica: **~40%**
- Area 6 Commerciale: **~45%**
- Area 7 MUD/Enti: **~15%**
- Area 8 Automazione: **~60%**, con AI e OCR in vantaggio netto

**Copertura complessiva: circa 55%.**

### Ordine di lavoro consigliato

1. **RENTRI** — ricostruzione connessione (certificato/mTLS), invio registro, conservazione, rettifiche, campi Provenienza e Tipo Formulario. È l'unico blocco con impatto sanzionatorio.
2. **Completamento FIR** — carico respinto, sosta tecnica, trasbordo, intermodale, Allegato VII, più intermediari, scarico di trasferimento, cestino ripristino, rettifiche tracciate, giacenze a data storica.
3. **MUD completo** — è l'area più scoperta e ha scadenza annuale rigida.
4. **Anagrafiche avanzate** — merge duplicati, storico variazioni, analisi chimiche, CER per anagrafica, carrozzerie mobili.
5. **Commerciale** — preventivi, contratti, listini massivi, note credito, fidi, Ri.Ba., clienti dormienti.
6. **Logistica avanzata** — pesa, MPS/EOW, lotti, pianificazione giri, manutenzione beni.
7. **Extra** — Albo Gestori, registro per conto terzi, ORSO, SEVESO.
