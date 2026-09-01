DO $$
DECLARE v_item uuid; v_cause uuid; v_tenant uuid := 'dc2a6046-d9a8-4549-8e45-82367d695ac6';
BEGIN
  SELECT id INTO v_item FROM public.dragon_items WHERE company_id = v_tenant AND upper(codice_cer) = '200140-FE' AND attivo LIMIT 1;
  IF v_item IS NULL THEN
    INSERT INTO public.dragon_items (company_id, codice_cer, descrizione)
    VALUES (v_tenant, '200140-FE', 'Metalli ferrosi da raccolta differenziata') RETURNING id INTO v_item;
  END IF;
  SELECT id INTO v_cause FROM public.dragon_causes WHERE code = 'RETTIFICA_GIACENZA_POSITIVA';

  ALTER TABLE public.magazzino_giacenze DISABLE TRIGGER trg_magazzino_sync_to_dragon;
  ALTER TABLE public.dragon_stock_movements DISABLE TRIGGER trg_dragon_sync_stock_to_magazzino;

  INSERT INTO public.dragon_stock_movements (company_id, item_id, cause_id, quantity, sign, warehouse_scope, note)
  VALUES (v_tenant, v_item, v_cause, 120, 'PLUS', 'WASTE', 'Allineamento iniziale Dragon <- giacenze operative');

  ALTER TABLE public.dragon_stock_movements ENABLE TRIGGER trg_dragon_sync_stock_to_magazzino;
  ALTER TABLE public.magazzino_giacenze ENABLE TRIGGER trg_magazzino_sync_to_dragon;
END $$;