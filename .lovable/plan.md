# Stabilizzazione operativa urgente — FIR, RENTRI, impianto e giacenze

## Obiettivo
Entro il prossimo turno operativo, nessuna schermata deve contraddirne un'altra e nessuna azione deve modificare registro o giacenze prima della conferma ufficiale prevista. Ogni risultato sarà accompagnato dalla prova che lo dimostra; ciò che non è provato resterà dichiarato come non certificato.

## Ordine di intervento

### 1. Mettere in sicurezza giacenze e cernite
- Fotografare prima di ogni prova: righe, kg totali, saldi negativi, movimenti Dragon visibili e nascosti (`is_system_hidden`), cernite e output.
- Inventariare tutti i punti che possono scrivere giacenze, movimenti e registro.
- Bloccare i bypass applicativi: resta autorizzato solo il punto unico già previsto, chiamato dopo un evento umano e certificato.
- Non cambiare storico, non riallineare, non ricalcolare, non eseguire invii o pesate reali senza autorizzazione.
- Ripetere lo snapshot dopo ogni gruppo di modifiche; fermarsi immediatamente a qualsiasi variazione inattesa.

### 2. Rendere lo stato FIR unico e verificabile
- Una funzione comune determina lo stato mostrato in ufficio, app autista, cronologia e dettaglio.
- `Inviato al RENTRI` compare solo con conferma ufficiale riconciliata; il solo valore locale `status=inviato` non basta.
- Introdurre stati leggibili e non ambigui: `Bozza`, `Richiesta in verifica`, `Partenza confermata dal RENTRI`, `In viaggio`, `Arrivo da completare`, `Chiuso dal destinatario`, `Respinto dal RENTRI`.
- Aggiungere nella scheda FIR una sezione “Verifica RENTRI” con ultimo controllo, stato ufficiale, numero/identificativo, QR disponibile e motivo completo dell'eventuale rifiuto.
- Riconciliare in sola lettura i FIR già esistenti, incluso `ZRZXR 000772 TM`, senza reinviarli e senza cambiare giacenze.

### 3. Rendere operativo l'impianto destinatario
- La pagina impianto legge direttamente dal RENTRI i FIR in cui l'impianto è destinatario, non soltanto i record locali marcati `inviato`.
- Per ogni FIR mostra dati ufficiali, stato, produttore, trasportatore, CER, quantità dichiarata e firme già presenti.
- Il flusso unico è: selezione FIR → data/ora arrivo → peso reale → accettazione totale/parziale o respingimento → motivazione se necessaria → conferma umana → trasmissione al RENTRI → verifica dell'esito.
- Il formulario viene chiuso localmente e il punto unico giacenze viene chiamato solo dopo conferma positiva del RENTRI; se il RENTRI rifiuta, rimane aperto, non cambia saldi e conserva il motivo completo.
- Eliminare o disabilitare la vecchia azione impianto che oggi chiude solo localmente senza invio RENTRI.

### 4. Stabilizzare app autisti e uso d'ufficio
- Ufficio e autista devono aprire lo stesso record e vedere lo stesso stato, senza etichette discordanti.
- Verificare assegnazione multipla, riassegnazione prima delle firme, salvataggio bozza, modifica in tempo reale e persistenza di date/campi durante lo scorrimento.
- La partenza è consentita solo dopo conferma ufficiale RENTRI e disponibilità del QR/documento ufficiale; altrimenti il FIR resta modificabile e il viaggio è bloccato.
- Dopo la partenza, l'autista vede chiaramente il FIR in viaggio e il QR ufficiale; l'arrivo viene completato dall'impianto destinatario, non simulato localmente dall'autista.

### 5. Errori, cronologia e Dark Lemon
- Ogni richiesta RENTRI conserva data, società, operazione, FIR, transazione, stato HTTP, campi rifiutati e risposta completa.
- Mostrare il motivo operativo in italiano senza perdere il dettaglio tecnico originale.
- Dark Lemon può leggere lo stato, spiegare il rifiuto, indicare i campi da correggere e preparare modifiche; ogni salvataggio o effetto operativo resta sotto conferma umana.
- Dark Lemon non può firmare, chiudere FIR, confermare pesate, rendere movimenti effettivi o modificare giacenze.

### 6. Certificazione prima dell'apertura operativa
- Eseguire test automatici mirati per stato FIR, rifiuti, firma destinatario, idempotenza e divieto di scritture premature.
- Eseguire controlli browser su ufficio, app Multy, app Niyol, console RENTRI e pagina impianto.
- Ripetere i controlli in sola lettura più volte e confrontare gli snapshot dei saldi e delle cernite.
- Preparare un referto con una prova associata a ogni voce e un elenco esplicito di ciò che resta non certificato.
- Solo dopo questi controlli, proporre una singola prova reale guidata; nessun invio reale viene eseguito senza autorizzazione esplicita.

## Primo blocco già individuato
- Le cronologie e gli elenchi classificano ancora `status=inviato` come inviato senza controllare l'identificativo ufficiale RENTRI; per questo Kevin appare inviato nell'elenco e da inviare nel dettaglio.
- La pagina `Impianto — Destinatario` legge solo FIR locali con `status=inviato`, applica il movimento di giacenza e chiude il record locale, ma non trasmette prima l'accettazione al RENTRI. Questo percorso verrà bloccato e sostituito dal flusso RENTRI verificato.

## Criterio di uscita
Il lavoro non sarà dichiarato concluso finché le stesse informazioni non coincidono in elenco, dettaglio, app e RENTRI; l'impianto non completa realmente peso/esito/firma; e gli snapshot non dimostrano che giacenze e cernite sono rimaste protette.
