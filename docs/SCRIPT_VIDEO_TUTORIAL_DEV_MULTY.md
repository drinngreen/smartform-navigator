# 🎬 Script Video Tutorial — Dev Multy (Multyproget · Centro di Comando)

> Durata stimata: **~12 minuti** · Lingua: italiano · Tono: professionale, diretto, senza gergo inutile.
> Base documentale: `docs/GUIDA_DEV_MULTY.md` (aggiornata al 18 agosto 2026).
> Legenda colonne: **A schermo** = cosa registrare · **Voce** = testo da leggere · **Sovrimpressione** = titolo breve on-screen.

---

## Cap. 1 — Intro e accesso (00:00 – 00:50)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 00:00 | Logo Multyproget, poi dissolvenza sulla dashboard | Benvenuto nel Centro di Comando di Multyproget, l'area Dev Multy: da qui gestisci impianto, formulari, privati, giacenze, RENTRI e fatturazione in un solo posto. | Dev Multy · Centro di Comando |
| 00:15 | Barra indirizzi con `/mn/admin/dev-multyproget` | Si entra dall'indirizzo barra admin dev-multyproget. L'accesso è riservato agli amministratori autorizzati. | Accesso riservato admin |
| 00:28 | Click su due tab diverse, mostrando l'URL che cambia in `?tab=` | Ogni scheda resta memorizzata nell'indirizzo: se ricarichi la pagina o mandi il link a un collega, torni esattamente dove eri. | La pagina ricorda dove eri |
| 00:38 | Panoramica delle tab colorate | I colori aiutano: verde è l'area Multyproget, ciano è Niyol, rosso è il Magazzino Dev, ambra le allerte e il MUD, viola la firma e gli invii RENTRI, giallo il personale. | Legenda colori |

---

## Cap. 2 — Le regole d'oro dei formulari (00:50 – 02:00)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 00:50 | Schermata creazione formulario | Prima di tutto, tre regole che valgono ovunque tu compili un formulario: impianto, conto proprio, contatti, Niyol, app degli autisti. | 3 regole valide ovunque |
| 01:00 | Digitare un numero FIR e cliccare "Crea formulario" | Regola uno: il numero del formulario si assegna **solo a mano**. Nessun formulario compare da solo. Digiti il numero, clicchi Crea formulario e la bozza si apre subito. In alternativa assegni un numero dal Centro App e FIR. | Numero FIR sempre manuale |
| 01:18 | Toggle Standard → Alternativo con un campo già compilato | Regola due: ogni formulario esiste in due viste, Modulo Standard e Modulo Alternativo. Sono la stessa scheda: quello che scrivi in una compare nell'altra, in tempo reale. Puoi passare da una all'altra anche a metà compilazione. | Due viste, un solo formulario |
| 01:36 | Click sull'icona cestino, poi sul pulsante gomma di una sezione | Regola tre: il cestino elimina la bozza e storna in automatico registro e giacenze. La gomma, invece, azzera solo la sezione su cui la premi, lasciando intatto tutto il resto. | Cestino = storno · Gomma = reset sezione |
| 01:44 | Sezione 6 "Caratteristiche del Rifiuto", click sul campo Codice EER | Il codice CER non si digita più a memoria: apri la tendina, cerchi per codice o per descrizione e scegli. Di default vedi i CER preferiti, con la spunta "Tutti i CER europei" hai l'intero catalogo. Appena selezioni, la descrizione del rifiuto si compila da sola. Stessa tendina nel Modulo Alternativo, direttamente sul riquadro del modulo cartaceo: quello che scegli finisce nella stampa ufficiale e nel riepilogo del trasporto. | Tendina CER + descrizione automatica |
| 01:50 | Pulsanti "Salva bozza" e "Salva definitivo" | Salva bozza tiene il formulario modificabile e non movimenta il magazzino. Salva definitivo scrive nei registri e aggiorna le giacenze. | Bozza ≠ definitivo |

---

## Cap. 3 — Tab Impianto (02:00 – 03:00)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 02:00 | Tab Impianto, elenco movimenti | Questa è la tab Impianto: qui vedi solo i movimenti dell'impianto di via Rivarossa, mai quelli di conto proprio. | Solo movimenti impianto |
| 02:12 | Applicare filtri data, CER, carico/scarico | Puoi filtrare per data, per codice CER, per tipo carico o scarico e per ruolo produttore o destinatario. | Filtri rapidi |
| 02:24 | Scorrere l'elenco formulari | L'elenco formulari mostra CER, produttore, destinatario, trasportatore e le quantità di partenza e di arrivo. | Colpo d'occhio sul formulario |
| 02:36 | Evidenziare una riga ambra | Se una riga è gialla-ambra, il formulario è chiuso ma manca il peso a destino: aprilo, inserisci la quantità di arrivo e salva. | Riga ambra = manca peso destino |
| 02:48 | Click su "Sync giacenze" | Il pulsante Sync giacenze ricalcola e verifica i saldi. Usalo ogni volta che vuoi una conferma indipendente. | Sync giacenze |

---

## Cap. 4 — Niyol e Conto Proprio (03:00 – 03:45)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 03:00 | Tab Niyol | La tab Niyol mostra solo i formulari in cui Niyol è produttore, destinatario o trasportatore. | Vista Niyol |
| 03:12 | Riga del registro generale di Niyol | Niyol non ha impianto, quindi le sue giacenze restano a zero, ma il registro generale viene comunque aggiornato, anche quando Niyol è solo trasportatore. | Registro sì, giacenze no |
| 03:24 | Tab Conto Proprio | Conto Proprio raccoglie i trasporti in categoria 2-bis: stessa lista, stesse regole. Le intermediazioni non stanno qui, ma dentro Registri. | Conto Proprio · Cat. 2-bis |
| 03:34 | Schema grafico produttore/destinatario/trasportatore | Ricorda la regola che genera più dubbi: le giacenze si muovono **solo** se Multyproget è produttore o destinatario. Se Multy trasporta e basta, il magazzino non cambia. E questo è corretto, non è un errore. | Trasportatore = nessun impatto stock |

---

## Cap. 5 — Registri (03:45 – 04:50)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 03:45 | Tab Registri, tre sottoschede | I Registri hanno tre sezioni: Intermediario, Registro Generale e Invii al RENTRI. | Registri · 3 sezioni |
| 03:55 | Sottoscheda Intermediario | Intermediario raccoglie i movimenti della categoria 8, la sola intermediazione. | Categoria 8 |
| 04:05 | Registro Generale con filtro data + tasto destro → esporta | Nel Registro Generale filtri per giorno singolo, tenant, CER, tipo o testo libero. Con il tasto destro su una riga esporti la selezione in Excel. | Export con tasto destro |
| 04:18 | Click su "Conto Terzi Manuale" | Conto Terzi Manuale serve quando un cliente ti porta fisicamente un formulario cartaceo: lo registri e viene trattato come un formulario digitale, registro e giacenze compresi. | FIR cartaceo → registrato |
| 04:30 | Click su "Scarico Lavorazione R13" | Lo Scarico Lavorazione R13 sposta il materiale dai CER dei privati al CER aziendale, generando in un colpo solo lo scarico e il carico corrispondente. | R13 · doppio movimento sincrono |
| 04:42 | Sezione Invii al RENTRI | Negli Invii al RENTRI scegli registro e data limite e consolidi l'invio. Se il ponte è offline, puoi usare la simulazione per le dimostrazioni. Sotto trovi lo storico con identificativo transazione ed esito. | Invii RENTRI + storico |

---

## Cap. 6 — Contatti (04:50 – 05:25)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 04:50 | Tab Contatti, ricerca cliente | Contatti è la rubrica di clienti e impianti. Cerchi l'azienda e apri il Dettaglio. | Rubrica aziende |
| 05:02 | Aprire il dettaglio, scorrere le quattro schede | Dentro trovi quattro schede: unità locali, targhe dei mezzi, cantieri e autorizzazioni con numero, data di inizio e scadenza. | Unità locali · Targhe · Cantieri · Autorizzazioni |
| 05:15 | Sezione documenti scansionati | Puoi allegare i documenti scansionati, archiviati in un'area privata. E da qui puoi creare formulari, con le stesse regole viste all'inizio. | Documenti in area privata |

---

## Cap. 7 — Privati e conferimenti (05:25 – 06:45)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 05:25 | Tab Privati, nuovo conferimento | La tab Privati gestisce il registro DBT. Si parte cercando il privato per codice fiscale, nome o targa. | Registro Privati (DBT) |
| 05:38 | Selezione data conferimento | La data del conferimento la scegli tu al momento della creazione e la puoi modificare anche dopo. | Data sempre modificabile |
| 05:48 | Aggiunta di più righe materiale | Un conferimento può contenere più materiali: se il privato porta ferro, rame e cavi, li inserisci tutti nello stesso conferimento e la ricevuta li elenca uno per uno. | Conferimento multi-materiale |
| 06:02 | Aprire la tendina CER e spuntare "mostra tutti i CER" | La tendina propone i materiali che movimenti davvero. Se ti serve un codice fuori elenco, spunti "mostra tutti i CER del catalogo europeo" e accedi a tutti gli ottocentoquarantatré codici. La tendina non si chiude mentre scorri. | 843 codici disponibili |
| 06:18 | Selezione metodo di pagamento e salvataggio | Indichi i chili per ogni materiale, scegli il metodo di pagamento — contanti o tracciabile — e salvi. | Pagamento obbligatorio |
| 06:28 | Giacenza che si aggiorna subito dopo il salvataggio | Il salvataggio è una transazione unica: crea conferimento, ricevuta e movimento di magazzino, ricalcola il saldo e lo verifica. Se il saldo non torna, il salvataggio fallisce e ti avvisa. Non esistono più conferimenti salvati ma non contabilizzati. | Garanzia atomica sulle giacenze |
| 06:38 | Widget limiti con barra colorata | Ogni privato ha il limite di millecinquecento chili all'anno: la barra è verde, poi ambra, poi rossa, e puoi mandare l'avviso via WhatsApp. | Limite 1500 kg/anno |
| 06:42 | Click su Aggiorna e su Scarica limiti privati (PDF) | Il pulsante Aggiorna ricarica i chili conferiti in tempo reale; con Scarica limiti privati ottieni il PDF con nome, chili conferiti, chili residui e percentuale del limite per ogni privato. | Export limiti in PDF |

---

## Cap. 8 — Ricevute (06:45 – 07:10)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 06:45 | Tab Ricevute, elenco | A ogni conferimento corrisponde una ricevuta, con numero progressivo annuale univoco. | Numerazione DBT automatica |
| 06:55 | Aprire una ricevuta multi-materiale | La ricevuta riporta tutti i materiali del conferimento con i rispettivi chili, la data, il privato e il metodo di pagamento. | Ricevuta multi-materiale |
| 07:03 | Modificare la data e rigenerare il PDF | Se correggi la data, la ricevuta si rigenera. Il PDF è già intestato Multyproget. | PDF pronto da consegnare |

---

## Cap. 9 — Giacenze (07:10 – 07:40)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 07:10 | Tab Giacenze | Le Giacenze mostrano, per ogni CER, i chili attualmente a magazzino e i movimenti del periodo. | Saldo reale per CER |
| 07:20 | Attivare il toggle "mostra tutti i CER" | Di default vedi i materiali con giacenza. Con il toggle vedi anche quelli azzerati, utile per i controlli. | Anche i CER a zero |
| 07:30 | Click su Sync giacenze | Le descrizioni riportano il materiale reale. E in qualsiasi momento il pulsante Sync ricalcola e verifica i saldi. | Sync verificato |

---

## Cap. 10 — Gestione FIR, Firma Digitale e Console RENTRI (07:40 – 08:40)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 07:40 | Tab Gestione FIR | Gestione FIR è il cruscotto: bozze, inviati, cartacei, cestinati. Cerchi per numero, filtri per stato, tenant e periodo, esporti in CSV. | Cruscotto FIR |
| 07:53 | Riaprire un FIR in vista alternativa | Da qui riapri qualsiasi formulario nella vista che preferisci, o lo cestini con lo storno automatico. | Riapri o cestina |
| 08:03 | Tab Firma Digitale, selezione FIR completato | Nella Firma Digitale selezioni un formulario completato e lo mandi in firma. Se il produttore è Multy, la firma è singola; se Multy è destinatario con un produttore terzo, servono due firme. | Firma singola o doppia |
| 08:18 | Console RENTRI con QR e tab "Da firmare" | La Console RENTRI mostra il QR, la sincronizzazione, i formulari da firmare e i numeri già assegnati, con copia rapida del numero. | Console RENTRI |
| 08:30 | Campanella con badge arancione, click | Quando arrivano formulari da firmare, sulla campanella compare un numerino arancione: cliccandolo entri direttamente nell'elenco da firmare. | Alert arancione |

---

## Cap. 11 — Fatturazione (08:40 – 09:40)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 08:40 | Tab Fatturazione, Nuova Fattura da FIR | La fattura nasce direttamente da un formulario: il sistema valida la partita IVA e genera le righe con aliquote e conti già impostati. | Fattura dal formulario |
| 08:55 | Fattura in stato Cortesia | La fattura nasce in stato Cortesia: hai ventiquattro ore per modificarla o annullarla. | 24 ore per correggere |
| 09:05 | Invio SDI, stato Inviata | Con l'invio allo SDI viene generato il file FatturaPA e registrata la scrittura in prima nota in partita doppia. Da quel momento la fattura è immutabile. | Inviata = immutabile |
| 09:18 | Pagina Sandbox Sibill | L'integrazione Sibill sincronizza documenti e controparti, e con la modalità Sandbox puoi provare tutto senza inviare nulla di reale. | Sibill + Sandbox |
| 09:30 | Sezione Noleggio Cassoni, selezione multipla | Nel noleggio cassoni, ogni mese vedi i noleggi del mese precedente non ancora fatturati: li selezioni e generi un'unica fattura per cliente. | Noleggi in una fattura |

---

## Cap. 12 — Personale e app degli autisti (09:40 – 10:35)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 09:40 | Tab Personale, dialog creazione utente | I login degli autisti si gestiscono tutti da qui: crei, modifichi ed elimini gli accessi, e decidi se l'utente appartiene a Multyproget o a Niyol. | Login gestiti dall'admin |
| 09:55 | Inserimento codice fiscale con validazione | Il codice fiscale viene validato: sedici caratteri, formato reale. Il completamento automatico del browser è disattivato, quindi scrivi sempre il dato a mano. Se sbagli, l'errore è esplicito. | Codice fiscale validato |
| 10:08 | Click su "Assegna FIR all'app", chip multipli | Con Assegna FIR all'app scegli quanti numeri dare a quell'autista e per quale società. Puoi assegnarne più di uno, oppure contrassegnare un numero come "assegnato all'ufficio". | Assegnazione numeri FIR |
| 10:20 | App autista con elenco numeri | L'app dell'autista non parte più con un formulario precaricato: mostra l'elenco dei numeri che gli hai assegnato. Nelle app non compare la fatturazione: quella resta all'ufficio. | Nessun FIR "misterioso" |
| 10:28 | Dialog Storico FIR, tab Bozze e Inviati | Lo Storico FIR ti mostra bozze e inviati di ogni autista. | Storico per autista |

---

## Cap. 13 — MUD e DDT (10:35 – 11:05)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 10:35 | Tab MUD, selettore anno e card | La tab MUD prepara la dichiarazione annuale: scegli l'anno e vedi subito carichi, scarichi, giacenza netta e CER movimentati. | MUD annuale |
| 10:48 | Click su "Esporta per MUD (Excel)" | L'esportazione genera un Excel con quattro fogli: riepilogo per CER, aggregato per soggetti, registro completo e totali. | Excel a 4 fogli |
| 10:56 | Tab DDT, creazione documento e stampa | La tab DDT crea i documenti di trasporto occasionali con numerazione automatica, destinatario, descrizione, targa e causale, e li stampa in PDF con i riquadri firma. | DDT numerati in automatico |

---

## Cap. 14 — Dark Lemon AI (11:05 – 11:45)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 11:05 | Widget flottante, poi pannello laterale | Dark Lemon è l'assistente del gestionale. Lo trovi in quattro viste: widget flottante, pannello laterale, dentro la Console RENTRI e nella sua pagina dedicata. | Dark Lemon · 4 viste |
| 11:18 | Aprire la Cronologia con le etichette | La cronologia è unica e la vedi da qualsiasi vista: ogni conversazione ha l'etichetta di dove è nata e si elimina singolarmente con il cestino. | Cronologia con origine |
| 11:30 | Click su 📸 e su 🔍 Analizza pagina | Con la fotocamera gli mandi uno screenshot della schermata, con la lente gli fai leggere la pagina attiva. Può anche compilare i campi del formulario che stai guardando e verificare la coerenza di giacenze e registri. | Vede, legge, compila, controlla |

---

## Cap. 15 — Troubleshooting e chiusura (11:45 – 12:20)

| Timecode | A schermo | Voce | Sovrimpressione |
|---|---|---|---|
| 11:45 | Tabella riassuntiva a schermo | Chiudiamo con i cinque dubbi più frequenti. | Cinque casi frequenti |
| 11:52 | Punto 1 | La giacenza non cambia dopo un formulario: Multy non era né produttore né destinatario. È corretto. | 1 · Giacenza ferma |
| 11:58 | Punto 2 | La giacenza non cambia dopo un privato: non può accadere, la procedura fallirebbe. Premi Sync giacenze per riverificare. | 2 · Conferimento privato |
| 12:04 | Punto 3 | Numero FIR già utilizzato: è duplicato nello stesso tenant, cambia numero o cestina il duplicato. | 3 · Numero duplicato |
| 12:09 | Punto 4 | Non trovi un CER: spunta "mostra tutti i CER del catalogo europeo". | 4 · CER mancante |
| 12:13 | Punto 5 | Bridge RENTRI offline: usa la simulazione oppure riprova dopo trenta minuti. | 5 · Bridge offline |
| 12:17 | Logo di chiusura | Tre cose da ricordare sempre: i numeri FIR si assegnano a mano, le giacenze si muovono solo quando Multyproget è parte del formulario, e non si cancella mai nulla davvero: tutto viene stornato e tracciato. Buon lavoro. | Manuale · Tracciato · Verificato |

---

## Note per chi registra

- Registra a 1920×1080, zoom del browser al 100%, con dati reali oscurati dove necessario.
- Usa sempre un formulario di prova e cestinalo a fine registrazione (lo storno è automatico).
- Mostra il cursore e rallenta sui click chiave (Crea formulario, Salva definitivo, Sync giacenze).
- Evidenzia con un riquadro colorato: riga ambra, badge arancione della campanella, barra dei limiti dei privati.
- Se serve una versione breve (~4 minuti), tieni i capitoli 1, 2, 3, 7 e 15.
