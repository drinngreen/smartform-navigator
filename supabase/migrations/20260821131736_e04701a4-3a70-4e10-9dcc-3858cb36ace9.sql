UPDATE public.dragon_items SET codice_cer='160214'
WHERE company_id='77ec9a3d-602e-438f-97bf-1c69abd8f691' AND codice_cer='160214*'
AND NOT EXISTS (SELECT 1 FROM public.dragon_items d2 WHERE d2.company_id='77ec9a3d-602e-438f-97bf-1c69abd8f691' AND d2.codice_cer='160214');

INSERT INTO public.dragon_items (company_id, codice_cer, descrizione, pericoloso, item_type, attivo, metadata)
SELECT '77ec9a3d-602e-438f-97bf-1c69abd8f691', g.cer, COALESCE(MAX(g.descrizione_cer), g.cer), false, 'WASTE_CER', true,
       jsonb_build_object('source','allineamento_giacenze_operative')
FROM public.magazzino_giacenze g
WHERE g.tenant_id='77ec9a3d-602e-438f-97bf-1c69abd8f691'
  AND NOT EXISTS (SELECT 1 FROM public.dragon_items i WHERE i.company_id='77ec9a3d-602e-438f-97bf-1c69abd8f691' AND i.codice_cer=g.cer)
GROUP BY g.cer;

WITH dr AS (
  SELECT i.id AS item_id, i.codice_cer,
         COALESCE(SUM(CASE WHEN m.sign='PLUS' THEN m.quantity ELSE -m.quantity END) FILTER (WHERE m.warehouse_scope='WASTE'),0) AS dragon
  FROM public.dragon_items i
  LEFT JOIN public.dragon_stock_movements m ON m.item_id=i.id
  WHERE i.company_id='77ec9a3d-602e-438f-97bf-1c69abd8f691'
  GROUP BY i.id, i.codice_cer
), lg AS (
  SELECT cer, SUM(quantita_kg) AS legacy FROM public.magazzino_giacenze
  WHERE tenant_id='77ec9a3d-602e-438f-97bf-1c69abd8f691' GROUP BY cer
)
INSERT INTO public.dragon_stock_movements (company_id, item_id, warehouse_scope, sign, quantity, movement_date, cause_id, note)
SELECT '77ec9a3d-602e-438f-97bf-1c69abd8f691', dr.item_id, 'WASTE'::public.dragon_warehouse_scope,
       (CASE WHEN lg.legacy - dr.dragon > 0 THEN 'PLUS' ELSE 'MINUS' END)::public.dragon_sign,
       ABS(lg.legacy - dr.dragon), CURRENT_DATE,
       '8aa00dc2-bea8-4464-9424-56118b1c24ed',
       'Allineamento giacenza operativa — rettifica auditabile, nessuna cancellazione'
FROM dr JOIN lg ON lg.cer = dr.codice_cer
WHERE ABS(lg.legacy - dr.dragon) > 0.01;