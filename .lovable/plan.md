# Ripristino giacenze certificate del 18 settembre

## Prove già accertate in sola lettura

- Il primo PDF è la fotografia di riferimento: totale **276.538,17 kg**.
- Nel secondo PDF le sole variazioni operative reali del 18 sono le due cernite delle 17:01:
  - `170407`: scarico 4.000 kg e carico `160214` di 4.000 kg;
  - `170407`: scarico 3.000 kg e carico `160216` di 3.000 kg.
- Queste quattro righe sono presenti sia nei movimenti impianto sia nel registro di controllo giacenze, attribuite a un operatore umano e con origine `CERNITA_CONFERMATA`.
- Le altre differenze tra i PDF non sono operazioni del 18:
  - `120102`: +5.000 kg di carico;
  - `170405`: +5.000 kg di scarico;
  - `150103`: +4.940 kg di carico;
  - `150106`: +4.940 kg di scarico.
- Questi 9.940 kg per lato derivano da quattro rettifiche tecniche nascoste del 15 settembre. La schermata le ha riportate indirettamente nelle colonne carico/scarico per forzare l'allineamento al saldo consolidato. Non esiste alcun movimento reale del 18 che le giustifichi.
- Nel database, il 18 settembre sono cambiate soltanto `160214`, `160216` e `170407`. Il totale è rimasto **276.538,17 kg**.

## Correzione della vista, senza modificare dati

1. Salvare nel codice la fotografia completa del primo PDF come base certificata della mattina del 18 settembre.
2. Calcolare la vista successiva aggiungendo esclusivamente operazioni reali registrate dopo la fotografia, con origine verificabile (cernita confermata o movimento d'ufficio/documentale).
3. Escludere rettifiche tecniche nascoste, differenze inventate per quadratura e qualsiasi movimento Dragon privo di origine reale.
4. Usare la stessa fonte per tabella, stampa PDF ed export Excel.
5. Verificare che la vista risultante mostri:
   - `170407 = 6.885,50 kg`;
   - `160214 = 5.715,00 kg`;
   - `160216 = 3.005,00 kg`;
   - totale `276.538,17 kg`;
   - tutti gli altri CER identici al primo PDF.
6. Eseguire screenshot e impronta di controllo prima/dopo. Nessuna scrittura, rettifica o cancellazione nel database.

## Dettagli tecnici

La schermata attuale mescola movimenti Dragon e saldo consolidato, producendo colonne incoerenti. Verrà resa indipendente da Dragon: fotografia certificata + soli movimenti reali successivi, deduplicati per identificativo. Il meccanismo resta esclusivamente di lettura.
