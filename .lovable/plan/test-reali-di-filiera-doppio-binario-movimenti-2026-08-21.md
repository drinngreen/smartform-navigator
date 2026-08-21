# Test Reali di Filiera + Doppio Binario Movimenti

## Obiettivo
Due interventi collegati, entrambi isolati e senza toccare FIR, Privati, Ricevute, RENTRI, Fatturazione:
1. Un **motore di test reale** ("testa cernite", "testa giacenze", "testa FIR") che esegue davvero le operazioni sul database, verifica i risultati e poi rimuove integralmente ogni traccia del test.
2. La **logica a doppio binario** (movimenti esterni con FIR/DDT vs. movimenti interni di lavorazione senza FIR) con tolleranza sul calo peso e magazzino MPS separato.

---

## Parte 1 — Motore di test di filiera

### Come funziona
- Nuovo pannello **"Test di Sistema"** dentro Magazzino Dev (nuova tab), con tre pulsanti: **Testa Cernite**, **Testa Giacenze**, **Testa FIR**.
- Ogni esecuzione crea una **sessione di test** identificata da un codice univoco (es. `TEST-20260821-1433`). Tutti i record generati vengono marcati con quel codice.
- Il test gira lato database in RPC atomiche dedicate, così ogni passo è verificabile e reversibile.

### Scenario "Testa Cernite"
1. Fotografa i saldi correnti (snapshot pre-test).
2. Crea un articolo/CER di test e carica una quantità nota a magazzino.
3. Verifica che la giacenza sia salita esattamente di quella quantità.
4. Esegue una cernita reale (1 padre → 2 figli + calo peso).
5. Verifica: padre sceso, figli saliti, registro coerente, lotti creati, calo peso registrato.
6. Annulla la cernita e verifica il ripristino dei saldi.
7. Elimina tutti i dati della sessione di test.
8. Ricontrolla lo snapshot: **saldi identici a prima del test**, altrimenti il test è rosso.

### Scenario "Testa Giacenze"
Carichi e scarichi multipli, scarico oltre disponibilità (deve essere bloccato), coerenza tra movimenti registro, movimenti stock e giacenza calcolata, poi pulizia e riverifica snapshot.

### Scenario "Testa FIR"
Creazione bozza FIR di test (numero riservato alla serie test, mai dal pool reale), compilazione, sincronizzazione su registri/giacenze, verifica aggiornamenti, quindi rimozione completa e riverifica snapshot.

### Garanzie di pulizia
- I dati di test sono confinati a una sessione tracciata: la pulizia è completa e verificata, non "a occhio".
- Se la pulizia non riporta i saldi allo stato iniziale, il report lo segnala in rosso con l'elenco esatto delle differenze.
- Nessun numero FIR reale viene consumato, nessun invio RENTRI, nessuna email.

### Report
Per ogni test: elenco passi con esito, valori attesi vs. ottenuti, durata, e riga finale "Sistema integro dopo il test: SÌ/NO".

---

## Parte 2 — Doppio binario dei movimenti

### Binario A — Movimenti esterni (con documento)
Maschera per ingressi/uscite con trasporto su strada:
- Obbligatori: tipo movimento, data, CER, quantità, numero FIR (o DDT per le MPS), produttore/destinatario, trasportatore.
- Aggiorna registro rifiuti e giacenze come oggi.

### Binario B — Movimenti interni (senza FIR)
Maschera Cernite/Lavorazioni, che **non chiede mai** FIR, trasportatore o soggetti terzi:
1. **Scarico di lavorazione (padre)**: si sceglie un CER in giacenza e la quantità avviata al trattamento (causale R12/D13 interna). Provenienza e destinazione sono l'impianto stesso.
2. **Proposta di lavorazione (figli)**: si dichiara cosa si è ottenuto — CER figli rifiuto (carico da lavorazione a registro) e articoli MPS (carico nel magazzino merci separato).
3. La provenienza dei figli è il collegamento allo scarico padre, non un'anagrafica esterna.

### Calo peso
La somma dei figli può essere inferiore al padre: la differenza viene calcolata e salvata come `calo_peso_kg` sulla lavorazione, senza bloccare il salvataggio. Viene bloccato solo il caso opposto (figli > padre) o il saldo insufficiente.

### MPS e uscita merci
Le MPS restano nel magazzino merci, distinte dai rifiuti. L'uscita MPS avviene con DDT o scarico manuale di magazzino verso il cliente finale, mai con FIR.

---

## Dettagli tecnici
- Migrazioni **solo additive** su schema `dragon_*`: campo sessione di test sui movimenti/batch, `calo_peso_kg` su `dragon_transform_batches`, RPC `dragon_test_run_*` e `dragon_test_cleanup` in `SECURITY DEFINER` con `search_path` fisso e isolamento per `company_id`.
- I campi documentali dei movimenti esterni restano nullable per consentire i movimenti interni; nessuna colonna esistente viene resa obbligatoria.
- Nuovo componente `DevSystemTestModule` + hook dedicato; nessuna modifica alle funzioni esistenti oltre all'aggiunta della tab.
- La cernita continua a usare le RPC atomiche già in produzione: il test verifica quelle, non un percorso parallelo.
- Al termine: build pulita, controllo console/network e verifica di non regressione su Giacenze, Registro, Carico/Scarico, Cernite, Lotti.
- Aggiornamento obbligatorio di guida Dev Multy, tutorial e istruzioni Dark Lemon (nuovo comando "testa cernite/giacenze/FIR").
