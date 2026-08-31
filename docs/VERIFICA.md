# Sistema di verifica delle modifiche

Obiettivo: nessuna modifica viene dichiarata completata senza prove riproducibili.

## 1. Comando unico

```bash
node scripts/verify.mjs           # typecheck + test di regressione
node scripts/verify.mjs --smoke   # aggiunge lo smoke test browser sulle rotte critiche
```

Esito `FAIL` = la modifica non è consegnabile. Nessuna eccezione.

## 2. Cosa controlla

| Livello | Strumento | Regressioni intercettate |
|---|---|---|
| Compilazione | `tsc --noEmit` | import rotti, firme cambiate, props mancanti |
| Dati critici | `src/__tests__/regression/cerCatalog.test.ts` | descrizioni CER sparite, duplicati, flag pericoloso |
| Multi-tenant | `src/__tests__/regression/tenantIsolation.test.ts` | UUID tenant scambiati, preset azienda vuoti |
| Navigazione | `src/__tests__/regression/routes.test.ts` | pagine lazy inesistenti, rotte critiche rimosse |
| Runtime | `scripts/smoke_routes.py` | pagina bianca, error boundary, errori console |

## 3. Regola per ogni nuova modifica

Ogni intervento che tocca una logica di business aggiunge **un test di regressione**
nella cartella `src/__tests__/regression/` che fallirebbe senza la correzione.
Il test resta lì per sempre: è la garanzia che quel bug non torni.

## 4. Verifica dati (giacenze, FIR, registri)

I test sopra non toccano il database. Per i dati esiste un check unico:

```
scripts/check_coerenza.sql   -- read-only, 10 controlli, ogni riga deve dare 0 anomalie
```

Controlla: giacenze negative (Dragon e magazzino), conferimenti senza ricevuta,
ricevute orfane, ricevute anteriori al movimento, CER duplicati per differenze di
maiuscole, numeri FIR duplicati (formulari e pool), disallineamento tra registro
Dragon e magazzino operativo.

Per le modifiche che riguardano saldi o formulari serve, in aggiunta:

1. snapshot del saldo prima della modifica (query di lettura);
2. esecuzione dell'operazione reale;
3. snapshot dopo, con delta atteso dichiarato esplicitamente;
4. se il delta non coincide, la modifica è respinta.

## 4-bis. Verifica canale RENTRI

Prima di dichiarare operativo l'invio RENTRI dal programma:

1. `LISTA_BLOCCHI` per `multy` e `niyol` deve tornare `success: true` (bridge e certificati vivi);
2. lettura registro (`GET /dati-registri/v1.0/operatore/{ID}/registrazioni`) deve tornare 200;
3. l'invio va provato prima in **Verifica configurazione (nessun invio)** dalla Console RENTRI;
4. solo dopo l'esito positivo si esegue l'invio reale, che deve lasciare una riga in
   `rentri_invii_registri` con `stato = 'SENT'` e un `transazione_id`.

Nota: il cliente `global` non è supportato dal bridge (nessun certificato caricato).


## 5. Cosa non è una verifica

- "Ho letto il codice e sembra corretto"
- "La build passa"
- Screenshot di una pagina diversa da quella modificata

Solo l'output di `scripts/verify.mjs` + il confronto dei saldi valgono come prova.
