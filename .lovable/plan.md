# Vedere tutto il RENTRI (anno intero) e aggiornare le giacenze solo dai formulari di oggi

## Cosa non va adesso

- La console legge i formulari **senza periodo**: non c'è un elenco completo dell'anno.
- Il ruolo di ogni formulario viene calcolato **solo rispetto alla società con cui si legge**. Per questo il formulario partito stamattina come Niyol (BPJMG 000488 LL) non compare come "Multyproget produttore": letto dalla lista Niyol, Multyproget non viene riconosciuto.
- Nessun collegamento fra un formulario uscito dal magazzino Multyproget e le giacenze.

## Cosa faccio

### 1. Elenco RENTRI completo dell'anno
- Nella scheda "FIR da firmare" aggiungo il periodo: predefinito **1 gennaio dell'anno corrente → oggi**, modificabile.
- Leggo sempre **entrambe le società** (Multyproget e Niyol) e unisco in un unico elenco, senza doppioni: se lo stesso numero FIR arriva da tutte e due, resta una riga sola.
- I ruoli vengono calcolati confrontando i codici fiscali del formulario con **tutti e due** i codici fiscali aziendali. Così un formulario trasportato da Niyol con Multyproget produttore risulta "Niyol trasportatore + Multyproget produttore" e si trova con il filtro Produttore.
- Filtri: società, ruolo (tutti / produttore / trasportatore / destinatario), stato (da firmare / tutti), ricerca libera per numero, CER, nome.
- Colonne: data, numero, società e ruolo, CER, quantità, produttore, trasportatore, destinatario, stato RENTRI.

### 2. Giacenze: solo dai formulari di oggi, e solo con la tua conferma
Regola stretta:
- Riguarda **solo** i formulari con data di emissione **uguale alla data di oggi** (niente storico, mai).
- Solo quelli con **Multyproget produttore**: merce uscita dal magazzino Multyproget → **scarico**.
- L'aggiornamento **non parte da solo**: sulla riga compare il pulsante "Registra lo scarico dal magazzino", con quantità, CER e numero formulario mostrati prima. Confermi tu, riga per riga.
- Il movimento passa dall'unico punto autorizzato (`applica_movimento_giacenza`) con causale e documento legati al numero FIR: se premi due volte non raddoppia nulla.
- Ogni formulario con data precedente a oggi viene mostrato con l'etichetta "storico — nessun effetto sulle giacenze" e senza pulsante. Nessuna riga vecchia può toccare i saldi.

### 3. Il formulario di stamattina
Con questi cambiamenti BPJMG 000488 LL compare nell'elenco (Niyol trasportatore, Multyproget produttore, già accettato a destino con 13.020 kg). Essendo di oggi, avrà il pulsante di scarico: lo applichiamo solo se me lo confermi tu.

## Dettagli tecnici

- `RentriFirDaFirmarePanel.tsx`: parametri periodo passati a `elencoFormulariRentri`, filtro locale su `data_emissione`/`data_creazione`, merge per `numero_fir` normalizzato, `mapRow` riscritto per valutare i ruoli su entrambi i CF (`RENTRI_CF_SOGGETTO.multy` e `.niyol`), nuovo filtro ruolo e colonna ruolo multi-società.
- Nuova funzione `scaricoDaFirProduttore` (lib dedicata): guardia dura `data_emissione === oggi` e produttore = CF Multyproget, altrimenti rifiuta; chiama `applica_movimento_giacenza` con `p_segno: "SCARICO"`, `p_causale: "FIR_PRODUTTORE_MULTY"`, `p_documento: "FIR:<numero>:USCITA_PRODUTTORE"`, `p_attore: "human"`.
- Idempotenza verificata prima dell'invio leggendo `giacenze_applicazioni` per lo stesso documento.
- Nessuna scrittura su RENTRI, nessun ricalcolo, nessuno storno automatico.

## Verifiche

- Test di regressione: ruoli calcolati su due CF; dedup per numero; rifiuto dello scarico per formulari non di oggi; rifiuto per produttore diverso da Multyproget; nessun doppio scarico sullo stesso numero.
- `node scripts/verify.mjs --smoke` con output mostrato.
- Fotografia dei saldi prima e dopo ogni eventuale scarico confermato; se cambia un saldo fuori da questo percorso, mi fermo.
