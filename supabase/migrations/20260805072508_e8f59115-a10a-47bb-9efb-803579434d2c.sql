DELETE FROM public.magazzino_giacenze
WHERE tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691' AND cer = '30105';

UPDATE public.magazzino_giacenze
SET saldo_iniziale_kg = 966
WHERE tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691' AND cer = '200140 MET MIX';

UPDATE public.magazzino_giacenze
SET saldo_snapshot_at = '2026-08-04 23:59:59+00'
WHERE tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691';

UPDATE public.magazzino_giacenze g
SET quantita_kg = g.saldo_iniziale_kg + COALESCE((
  SELECT SUM(CASE WHEN m.tipo_movimento = 'CARICO' THEN m.quantita_kg ELSE -m.quantita_kg END)
  FROM public.movimenti_impianto m
  WHERE m.tenant_id = g.tenant_id
    AND m.impianto_id = g.impianto_id
    AND m.cer = g.cer
    AND m.data_movimento > DATE '2026-08-04'
), 0),
updated_at = now()
WHERE g.tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691';