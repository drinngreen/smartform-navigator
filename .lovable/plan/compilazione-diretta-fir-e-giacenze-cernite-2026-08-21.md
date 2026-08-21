# Compilazione diretta FIR e giacenze cernite

## Obiettivo
- Accanto a ogni numero FIR disponibile nel serbatoio, aggiungere **Compila formulario**.
- Il numero resta utilizzabile direttamente dall'ufficio senza assegnarlo a un dipendente.
- Il formulario si apre nel workspace completo, modificabile in vista Standard o Alternativa, con salvataggio in bozza e invio RENTRI.
- Le cernite aggiornano la stessa vista Giacenze usata nella dashboard.

## Interventi
1. Creare la bozza ufficio dal numero selezionato e aprirla direttamente nel workspace FIR, mantenendo il numero RENTRI.
2. Collegare Console RENTRI e workspace tramite identificativo del formulario, evitando assegnazioni manuali intermedie.
3. Correggere la vista Giacenze: oggi legge il sistema legacy, mentre la cernita scrive correttamente nei movimenti `dragon_*`; la schermata leggerà i saldi Dragon e reagirà in tempo reale ai movimenti di cernita.
4. Verificare il caso reale `FRVKM 001320 CM` e una cernita con scarico del CER padre e carico del CER prodotto.

## Dettagli tecnici
- Nessuna assegnazione automatica dei FIR viene riattivata.
- Nessun movimento di cernita viene duplicato nel magazzino legacy: `dragon_*` resta la fonte autorevole.
- Verranno mantenuti filtri rigorosi sul tenant Multyproget.
