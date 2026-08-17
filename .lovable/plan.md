# Conferimenti multi-materiale + allineamento giacenze al 17/08/2026

## 1. Conferimenti e ricevute privati con più materiali

Oggi un conferimento ha un solo CER (`privati_conferimenti.cer` + `kg_pesati`) e la ricevuta punta a un solo conferimento (`ricevute_privati.conferimento_id`).

Cosa cambia:

- Nel form "Nuovo Conferimento" (`DevPrivatiModule`) si potranno aggiungere **più righe materiale**: CER + kg + importo, con pulsanti "+ Aggiungi materiale" / cestino per riga. Con una sola riga il comportamento resta identico a oggi.
- Ogni riga genera una riga in `privati_conferimenti` (così i trigger di giacenza e i limiti annuali per CER continuano a funzionare esattamente come ora, senza toccarli), e tutte le righe condividono un nuovo campo `gruppo_id`.
- La ricevuta viene emessa **una sola** per gruppo: nuova colonna `gruppo_id` su `ricevute_privati` (la vecchia `conferimento_id` resta valorizzata con la prima riga, nessun dato esistente viene modificato).
- Stampa/PDF ricevuta e registro ricevute (`DevRicevuteModule`): al posto della riga singola "CER / Peso" compare una **tabella materiali** (CER, descrizione, kg, importo) con totale kg e totale importo. Le ricevute già esistenti (senza gruppo) continuano a stamparsi come oggi.
- Controllo limite 1500 kg annui: applicato sulla somma di tutte le righe del conferimento.

## 2. Giacenze: rimozione "Saldo iniziale"

La voce **Saldo iniziale** viene tolta dalla tabella a video, dalla stampa PDF e dall'export Excel di `DevGiacenzeModule`, lasciando C.E.R. / Descrizione / Carico / Scarico / Saldo — esattamente come il PDF ufficiale allegato.

Nessuna colonna del database viene cancellata: `magazzino_giacenze.saldo_iniziale_kg` resta dov'è, viene solo azzerata come componente di calcolo dopo l'allineamento del punto 3 (così `Saldo = Carico − Scarico` torna sempre, senza numeri "nascosti").

## 3. Allineamento allo stato dell'arte del 17/08/2026

Fonti allegate:

- `REGISTRO_MULTYPROGET_AGGIORNATO_IN_DATA_17_08_2026.xlsx` — 23 movimenti di registro Multyproget (04/08 → 17/08/2026).
- `FORMULARI_CONTO_PROPRIO_AGGIORNATI_AL_17_08_2026.xlsx` — 6 formulari conto proprio.
- `FORMULARI_NIYOL_AGGIORNATO_AL_17_04_2026.xlsx` — 30 formulari Niyol.
- `GIACENZE.pdf` — registrazioni per C.E.R. al 17/08/2026 (Carico / Scarico / Saldo ufficiali, ~60 CER).

Procedura:

1. Estensione dell'import esistente (`import-elisabetta`) con un nuovo blocco dati `data_2026_08_17.json`: movimenti registro + formulari, con **dedup** su numero formulario / (numero_fir + data + CER + quantità) — le righe già presenti vengono saltate, nulla viene cancellato.
2. Dopo l'import, confronto tra saldo calcolato dai movimenti e saldo del PDF per ogni CER. Dove c'è scarto, viene inserito **un solo movimento di rettifica** datato 17/08/2026 con nota "Allineamento ufficiale 17/08/2026", così le giacenze a video coincidono al kg con il PDF.
3. `saldo_iniziale_kg` portato a 0 e snapshot riallineato: da quel momento il saldo è puramente Carico − Scarico sui movimenti.

## 4. Giacenze sempre aggiornate

- Il modulo Giacenze legge già i movimenti live; verrà aggiunta la **sottoscrizione realtime** su `movimenti_impianto` e `privati_conferimenti`, così il valore si aggiorna da solo senza premere Aggiorna.
- Il pulsante "Sync giacenze da movimenti" resterà come ricalcolo forzato di `magazzino_giacenze`, esteso a tutti i CER presenti nei movimenti (oggi cicla solo sui CER già presenti in `magazzino_giacenze`, quindi un CER nuovo poteva restare fuori — è una delle cause dei disallineamenti segnalati dal cliente).

## Note tecniche

- Migrazioni: solo due colonne aggiuntive (`privati_conferimenti.gruppo_id`, `ricevute_privati.gruppo_id`), nessuna modifica a colonne/trigger esistenti.
- Nessuna cancellazione di dati: import con dedup e rettifiche in aggiunta.
- File toccati: `DevPrivatiModule.tsx`, `DevRicevuteModule.tsx`, `DevGiacenzeModule.tsx`, edge function `import-elisabetta`, `PerElisabettaDialog.tsx`.
