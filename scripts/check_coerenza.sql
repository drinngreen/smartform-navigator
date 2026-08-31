-- ============================================================
-- CHECK DI COERENZA DATI (read-only)
-- Eseguire prima di ogni consegna che tocchi giacenze/movimenti/
-- ricevute/FIR/RENTRI. Ogni riga deve risultare PASS.
-- ============================================================
with
neg_dragon as (
  select count(*) n from (
    select sm.item_id, sm.warehouse_id,
           sum(case when sm.sign='PLUS' then sm.quantity when sm.sign='MINUS' then -sm.quantity else 0 end) saldo
    from dragon_stock_movements sm
    where sm.test_session is null
    group by 1,2
  ) t where saldo < -0.001
),
neg_mag as (select count(*) n from magazzino_giacenze where quantita_kg < -0.001),
conf_no_ric as (
  select count(*) n from privati_conferimenti pc
  where not exists (select 1 from ricevute_privati r where r.conferimento_id = pc.id)
),
ric_orfane as (
  select count(*) n from ricevute_privati r
  where r.conferimento_id is not null
    and not exists (select 1 from privati_conferimenti pc where pc.id = r.conferimento_id)
),
ric_data as (
  -- la ricevuta non puo' precedere il movimento
  select count(*) n from ricevute_privati r
  join privati_conferimenti pc on pc.id = r.conferimento_id
  where r.data_emissione::date < pc.data::date
),
cer_case as (
  -- stesso CER scritto con maiuscole/minuscole diverse = giacenze spezzate
  select count(*) n from (
    select upper(codice_cer) c from dragon_items where attivo group by 1 having count(distinct codice_cer) > 1
  ) t
),
cer_case_mag as (
  select count(*) n from (
    select tenant_id, upper(cer) c from magazzino_giacenze group by 1,2 having count(distinct cer) > 1
  ) t
),
fir_dup as (
  select count(*) n from (
    select numero_fir from fir_forms
    where numero_fir is not null and coalesce(deleted_by_user,false) = false
    group by 1 having count(*) > 1
  ) t
),
fir_pool_dup as (
  select count(*) n from (
    select numero_fir from fir_number_pool group by 1 having count(*) > 1
  ) t
),
doppio_binario as (
  -- delta tra registro Dragon (normativo) e magazzino operativo, per CER
  select count(*) n from (
    select coalesce(d.cer, m.cer) cer,
           coalesce(d.kg,0) - coalesce(m.kg,0) delta
    from (
      select upper(i.codice_cer) cer,
             sum(case when sm.sign='PLUS' then sm.quantity when sm.sign='MINUS' then -sm.quantity else 0 end) kg
      from dragon_stock_movements sm
      join dragon_items i on i.id = sm.item_id
      where sm.test_session is null group by 1
    ) d
    full outer join (
      select upper(cer) cer, sum(quantita_kg) kg from magazzino_giacenze group by 1
    ) m on m.cer = d.cer
  ) t where abs(delta) > 0.5
)
select * from (
  values
    ('Giacenze Dragon mai negative',        (select n from neg_dragon)),
    ('Giacenze magazzino mai negative',     (select n from neg_mag)),
    ('Conferimenti senza ricevuta',         (select n from conf_no_ric)),
    ('Ricevute orfane',                     (select n from ric_orfane)),
    ('Ricevute anteriori al movimento',     (select n from ric_data)),
    ('CER duplicati per maiuscole (Dragon)',(select n from cer_case)),
    ('CER duplicati per maiuscole (Magazz.)',(select n from cer_case_mag)),
    ('Numeri FIR duplicati (formulari)',    (select n from fir_dup)),
    ('Numeri FIR duplicati (pool)',         (select n from fir_pool_dup)),
    ('Disallineamenti Dragon vs Magazzino', (select n from doppio_binario))
) as v(controllo, anomalie)
order by anomalie desc, controllo;
