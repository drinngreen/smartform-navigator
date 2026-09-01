# Report stato sistema — 1 settembre 2026

## Controllo a 10 fattori (Multy Dev › Test di Sistema › Controllo a 10 fattori)

| # | Controllo | Esito |
|---|---|---|
| 1 | Giacenze Dragon mai negative | OK |
| 2 | Giacenze magazzino mai negative | OK |
| 3 | Registro Dragon allineato al magazzino | OK |
| 4 | Controlli automatici di allineamento attivi | OK |
| 5 | Ogni conferimento privato ha la ricevuta | OK (362/362) |
| 6 | Ricevute coerenti con i movimenti | OK |
| 7 | Nessun codice materiale duplicato | OK |
| 8 | Nessun numero formulario duplicato | OK |
| 9 | Movimenti privati con ricevuta RENTRI | 3 posizioni aperte (vedi sotto) |
| 10 | Cernite completate con materiali in uscita | OK |

Gate di verifica applicativo: typecheck OK, 51/51 test di regressione OK.

## Correzioni eseguite oggi

1. **Due movimenti su azienda errata** — vitale elisabetta 10/03/2026 (200140-FE, 120 kg) e
   BONINO ALEX 01/04/2026 (200140-CAVO, 134 kg) erano registrati su un'azienda diversa da
   Multyproget: per questo non erano mai stati trasmessi al RENTRI. Spostati su Multyproget con
   progressivi 361 e 362; ora compaiono in Console RENTRI › Multyproget — Privati fra i
   **movimenti da inviare**.
2. **Giacenze allineate** — i relativi 254 kg sono confluiti nelle giacenze Multyproget:
   200140-FE 73.431 → **73.551 kg**, 200140-CAVO 9.073 → **9.207 kg**. Registro Dragon e
   magazzino operativo tornano perfettamente allineati (scostamento 0).
3. **Doppioni eliminati** — rimosse le righe di giacenza a zero sull'azienda errata e due
   movimenti di allineamento duplicati generati automaticamente.
4. **Annotazioni RENTRI** — le ricevute n. 1 e n. 272 riportano ora la nota di anomalia
   direttamente nella colonna esito della console.

## Posizioni ancora aperte (richiedono una decisione, nessun dato è stato forzato)

- **Prog. RENTRI 2026/272 — 11/07/2026, Cavazza Richard, 200140-RA**: trasmesso al RENTRI con
  **4.317 kg** mentre a registro il peso reale è **43,17 kg** (errore di virgola nell'invio fatto
  da terminale). È l'unica differenza di peso fra listato ufficiale (88.741 kg) e archivio
  (84.721 kg). Va rettificato con una registrazione correttiva sul RENTRI.
- **Movimenti 361 e 362** (120 kg + 134 kg): mai trasmessi al RENTRI, ora visibili come
  "da inviare".
- **Prog. RENTRI 2026/1 — 02/01/2026, 355 kg**: transazione accettata (202) ma ricevuta non
  ancora presente nel listato ufficiale; da verificare al prossimo scarico listato.

## Numerazione

Dal progressivo 239 in poi la numerazione interna del programma risulta sfalsata di 1 rispetto al
listato RENTRI (conseguenza dei due movimenti caricati sull'azienda errata). L'abbinamento fra
movimenti e ricevute avviene ora per **data + materiale + peso**, quindi lo sfalsamento non
produce falsi positivi. La numerazione interna non è stata toccata: rinumerare 120 movimenti già
trasmessi creerebbe una discordanza con le ricevute ufficiali.

## Ripristino

Punto di ripristino completo: `docs/backup/RIPRISTINO_2026-09-01.md`
(snapshot dati in `docs/backup/snapshot_2026-09-01_privati_rentri.json`).
Per annullare tutto è sufficiente scrivere in chat: **"ripristina il punto del 1 settembre"**.
