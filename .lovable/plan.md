

# Analisi della Filiera Dragon — Gap Analysis e Piano di Allineamento

## Stato Attuale vs Requisiti Operativi

### Fase 0: Configurazione Iniziale — PARZIALMENTE OK

| Requisito | Stato | Note |
|-----------|-------|------|
| Creazione Magazzini (CER/MPS, limiti) | OK | `DragonMagazziniPage` funziona |
| Creazione Articoli (CER/MPS/Materiali) | OK | `DragonArticoliPage` con fattore conversione e comunicazione enti |
| Modelli di Lavorazione (ricette cernita) | PRESENTE MA SCOLLEGATO | `DragonCerniteModelliPage` esiste ma NON è collegato alla cernita batch — quando fai una cernita manuale non ti propone i modelli predefiniti |

### Fase 1: Ingresso Rifiuti (Destinatario) — LACUNE IMPORTANTI

| Requisito | Stato | Note |
|-----------|-------|------|
| Registrazione FIR ingresso (produttore, trasportatore, CER) | MANCANTE | Il wizard Carico/Scarico è solo per PRODUTTORE (carico produzione fuori UL + scarico uscita). Non esiste un flusso "Ingresso Destinatario" |
| Peso a destino (FIR ufficiale solo con peso) | MANCANTE | Non c'è gestione dello stato "In attesa di peso" (giallo/rosso) |
| Stampa preliminare FIR per trasporto proprio | MANCANTE | Nessun collegamento tra Dragon e sistema FIR esistente |
| Causali destinatario (INGRESSO_UL, ecc.) | IN DB MA NON IN UI | Le causali sono nel DB ma nessun form le usa specificamente |

### Fase 2: Lavorazione/Cernita — QUASI OK

| Requisito | Stato | Note |
|-----------|-------|------|
| Scarico per lavorazione da registro | PARZIALE | Si può fare dalla giacenza magazzino ma NON dal registro |
| Distribuzione manuale kg su componenti | OK | `DragonCerniteBatchPage` funziona bene |
| Proposta automatica da modello | MANCANTE | I modelli esistono ma non vengono proposti durante la cernita |
| Generazione automatica scarico + carichi | OK | Il batch crea movimenti CONSOLIDATI automaticamente |
| FIFO | MANCANTE | Lo scarico cumulativo usa FIFO ma la cernita no |

### Fase 3: Monitoraggio Giacenze — OK

| Requisito | Stato | Note |
|-----------|-------|------|
| Stampa situazione magazzino | PARZIALE | Esiste export Excel dal registro, ma manca stampa giacenze magazzino |
| Tracciabilità/Rintraccia | MANCANTE | `DragonMovementDetail` mostra info base ma non la catena completa (FIR ingresso → scarico cernita → ricarico MPS) |

### Fase 4: Uscita Materiali — LACUNE

| Requisito | Stato | Note |
|-----------|-------|------|
| Scarico uscita con FIR (solo CER con giacenza) | PARZIALE | Lo scarico cumulativo filtra per CER ma non verifica giacenza effettiva |
| Abbinamento automatico ai carichi | MANCANTE | Nessuna logica FIFO per l'abbinamento |
| Apertura automatica schermata FIR | MANCANTE | Nessun collegamento Dragon → FIR system |
| Uscita MPS (scarico manuale o DDT) | PARZIALE | Scarico manuale MPS è possibile da magazzino, DDT mancante |

### Registri Multipli — MANCANTE

| Requisito | Stato | Note |
|-----------|-------|------|
| Registro Conto Proprio | MANCANTE | Esiste solo 1 registro PRODUTTORE nel DB |
| Registro Impianto (Destinatario) | MANCANTE | Da creare |
| Registro Intermediazione | MANCANTE | Da creare |
| Selezione registro nella UI | MANCANTE | Il registro è selezionato automaticamente (primo attivo) |

### Dark Lemon — PARZIALMENTE ALLINEATO

Il prompt di Dark Lemon contiene già schema aggiornato, causali destinatario e procedure. Ma non ha strumenti per eseguire operazioni Dragon direttamente (solo query readonly tramite `exec_sql_readonly`).

---

## Piano di Implementazione

### 1. Creare i registri mancanti nel DB
Inserire registri per DESTINATARIO, TRASPORTATORE e INTERMEDIARIO nella tabella `dragon_registers`.

### 2. Aggiungere selezione registro nella UI
Nel Registro Cronologico (`DragonRegistroPage`), aggiungere tabs o selector per scegliere tra i registri (Conto Proprio, Impianto, Intermediazione). Filtrare i movimenti per `register_id`.

### 3. Creare il flusso Ingresso Destinatario
Nuovo wizard "Ingresso FIR" che:
- Chiede: numero FIR, produttore, trasportatore, CER, data ricezione
- Permette di inserire o rinviare il peso a destino
- Usa le causali INGRESSO_UL / INGRESSO_MIO_CANTIERE / INGRESSO_CANTIERE_TERZI
- Genera movimento CARICO solo quando il peso a destino è inserito
- Evidenzia FIR senza peso in giallo/rosso nel registro

### 4. Collegare modelli di lavorazione alla cernita
Nella pagina cernita batch, quando si seleziona un articolo input, proporre automaticamente il modello corrispondente (se esiste) con le percentuali/quantità pre-calcolate. L'utente può comunque modificare manualmente.

### 5. Aggiungere "Scarico per Lavorazione" dal Registro
Nel dettaglio di un movimento CARICO nel registro, aggiungere un pulsante "Avvia Lavorazione" che porta alla cernita pre-popolata.

### 6. Aggiungere "Scarico Uscita con FIR" dal Registro
Pulsante nel registro che mostra solo CER con giacenza positiva, permette di selezionare quantità e genera lo scarico con abbinamento FIFO ai carichi.

### 7. Tracciabilità completa ("Rintraccia")
Nel dettaglio movimento magazzino, ricostruire la catena: FIR ingresso → carico registro → scarico lavorazione → batch cernita → ricarico componenti → scarico uscita.

### 8. Export giacenze magazzino
Aggiungere pulsante "Stampa Situazione" nella tab Saldi del magazzino.

### 9. Aggiornare Dark Lemon
Aggiornare il prompt con i nuovi flussi e dare capacità di esecuzione delle operazioni Dragon tramite tool o `exec_sql_write`.

### File coinvolti

| Azione | File |
|--------|------|
| DB Insert | `dragon_registers` — registri DESTINATARIO, TRASPORTATORE, INTERMEDIARIO |
| Modifica | `DragonRegistroPage.tsx` — tabs per registro, pulsanti azione su movimenti |
| Nuovo | `DragonIngressoWizard.tsx` — wizard ingresso destinatario |
| Nuovo | `DragonScaricoUscitaWizard.tsx` — wizard scarico uscita con FIR |
| Modifica | `DragonCerniteBatchPage.tsx` — proposta modello automatica |
| Modifica | `DragonMagazzinoPage.tsx` — export giacenze |
| Modifica | `DragonMovementDetail.tsx` — tracciabilità completa |
| Modifica | `DevMagazzinoDevModule.tsx` — aggiungere link a nuovi wizard |
| Modifica | `dark-lemon-mn/index.ts` — aggiornare prompt e tool |

Dato il volume di lavoro, propongo di procedere in 3 blocchi:
- **Blocco A**: Registri multipli + Ingresso Destinatario (punti 1-3)
- **Blocco B**: Lavorazioni integrate + Scarico uscita (punti 4-6)
- **Blocco C**: Tracciabilità + Export + Dark Lemon (punti 7-9)

