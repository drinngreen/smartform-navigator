# Giacenze coerenti dal 22/09 + Operazioni straordinarie di magazzino (stile Prometeo)

## Regole che restano intoccabili
- Giacenze fino al 21/09/2026 fisse: il database continua a rifiutare qualsiasi movimento che le tocchi con data fino al 21/09.
- Nessun automatismo: ogni variazione nasce solo da un click di una persona, con conferma.
- Magazzino dev resta non operativo; Dragon resta nascosto.

## 1. Giacenze a cascata dal 22/09 (verifica + prove)
La pagina Giacenze somma già in modo cumulativo: un movimento del 22/09 vale per il 22/09 e per tutti i giorni dopo; un secondo movimento si somma al primo, e così via. Aggiungo:
- **Blocco saldi negativi**: uno scarico o una cernita che porterebbe un CER sotto zero in qualunque giorno successivo viene rifiutato prima del salvataggio, con messaggio chiaro.
- **Test automatici** con dati finti (nessuna scrittura reale): movimento il 22/09 → saldi 22/09, 23/09, oggi aggiornati; secondo movimento il 25/09 → cascata corretta; cernita (scarico CER origine + carico CER uscita) → totale invariato; scarico eccessivo → rifiutato; data 21/09 → rifiutata.

## 2. Operazioni straordinarie senza formulario (come Prometeo)
Nuova scheda **"Operazioni di magazzino"** nell'area Impianto, con i pulsanti come in Prometeo:
- **Carico di lavorazione** (es. "da Lavorazione")
- **Scarico di lavorazione**
- **Rettifica inventariale** (+ o −, con motivo obbligatorio)

Ogni operazione: data (minimo 22/09), CER, kg, causale, note. Prima di salvare mostra un'anteprima: saldo del CER prima → dopo, per la data scelta e per oggi. Salvataggio solo con conferma. Diventa una riga del Registro Multy Impianto (tipo operazione "Carico/Scarico di Lavorazione", senza numero formulario) che incide sulle giacenze. Le operazioni appaiono nell'elenco con possibilità di **annullarle** tramite movimento inverso (mai cancellazione), come richiesto dalle regole di audit.

## 3. Cernite
Verifico che una cernita confermata dopo il 21/09 sposti i kg dal CER di origine ai CER di uscita da quel giorno in poi, con lo stesso blocco anti-negativo.

## 4. Screenshot prima/dopo (sempre)
Per ogni intervento reale che faccio io su giacenze, cernite o registro: screenshot di **Giacenze**, **Elenco cernite** e **Registro movimenti** prima e dopo, salvati nei tuoi File con data e ora nel nome. In questo lavoro scrivo solo codice e test: **nessun movimento reale viene inserito** senza un tuo ordine esplicito. Faccio comunque gli screenshot "prima" ora e "dopo" a fine lavoro per provare che nulla è cambiato.

## Dettagli tecnici
- Nuovo componente `OperazioniMagazzinoModule.tsx` registrato nel tab Impianto; scrive su `registro_generale` con `incide_giacenze=true`, `stato_movimento='effettivo'`, `registro='MULTY_IMPIANTO'`, tenant Multyproget.
- Funzione pura `calcolaSaldiGiornalieri()` estratta da `GiacenzeDocumentaliModule` e condivisa dalla pagina, dall'anteprima e dal controllo anti-negativo; test vitest in `src/__tests__/regression/giacenzeCascata.test.ts`.
- Annullo = riga inversa con `annotazioni` che cita l'id originale.
- Nessun trigger nuovo; il trigger esistente che rifiuta date ≤ 21/09 resta.
- Verifica con `node scripts/verify.mjs --smoke`, output mostrato.
