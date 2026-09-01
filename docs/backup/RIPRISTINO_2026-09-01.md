# Punto di ripristino — 1 settembre 2026, 21:26 UTC

Snapshot completo pre-correzione: `docs/backup/snapshot_2026-09-01_privati_rentri.json`

Contiene:
- `privati_conferimenti` (2 righe spostate di azienda)
- `ricevute_privati` (2 righe collegate)
- `rentri_registro_esiti` (359 righe registro MULTY_PRIVATI)
- `magazzino_giacenze` (74 righe, stato completo)
- `dragon_saldi` (53 saldi Dragon per articolo/magazzino)

## Cosa è stato modificato dopo lo snapshot

1. `privati_conferimenti` — `231714d1-1f24-4e08-8a21-515de2157ebc` (vitale elisabetta 10/03/2026)
   e `16495388-0525-4adf-a7b6-68cc0f180c59` (BONINO ALEX 01/04/2026):
   `tenant_id` da `dc2a6046-…` a `77ec9a3d-…` (Multyproget), progressivi 1 e 2 → 361 e 362.
2. `ricevute_privati` collegate: stesso cambio di `tenant_id`.
3. `magazzino_giacenze` Multyproget: `200140-FE` 73.431 → 73.551 kg, `200140-CAVO` 9.073 → 9.207 kg.
   Rimosse le righe a zero dell'azienda `dc2a6046-…` e i doppioni generati automaticamente.
4. `dragon_stock_movements`: rimossi 2 movimenti di allineamento duplicati
   (`50634d6c-…`, `5191e646-…`).
5. `rentri_registro_esiti` (MULTY_PRIVATI): annotazioni testuali sull'esito dei
   movimenti n. 272 (peso errato) e n. 1 (ricevuta non ancora nel listato).

## Come ripristinare

Basta scrivere in chat: **"ripristina il punto del 1 settembre"**.
La procedura eseguita sarà:

```sql
-- 1. movimenti privati e ricevute tornano all'azienda originaria
update privati_conferimenti set tenant_id='dc2a6046-d9a8-4549-8e45-82367d695ac6',
       numero_progressivo = case when id='231714d1-1f24-4e08-8a21-515de2157ebc' then 1 else 2 end
 where id in ('231714d1-1f24-4e08-8a21-515de2157ebc','16495388-0525-4adf-a7b6-68cc0f180c59');
update ricevute_privati set tenant_id='dc2a6046-d9a8-4549-8e45-82367d695ac6'
 where conferimento_id in ('231714d1-1f24-4e08-8a21-515de2157ebc','16495388-0525-4adf-a7b6-68cc0f180c59');

-- 2. giacenze riportate ai valori dello snapshot
update magazzino_giacenze set quantita_kg=73431.00
 where tenant_id='77ec9a3d-602e-438f-97bf-1c69abd8f691' and cer='200140-FE';
update magazzino_giacenze set quantita_kg=9073.0
 where tenant_id='77ec9a3d-602e-438f-97bf-1c69abd8f691' and cer='200140-CAVO';

-- 3. annotazioni RENTRI rimosse
update rentri_registro_esiti
   set esito = split_part(esito,' [',1)
 where registro_label='MULTY_PRIVATI' and numero_interno in (1,272);

-- 4. eventuale rimozione integrale delle 359 ricevute importate
-- delete from rentri_registro_esiti where registro_label='MULTY_PRIVATI';
```

Il file JSON permette comunque il ripristino riga per riga di qualunque tabella elencata.
