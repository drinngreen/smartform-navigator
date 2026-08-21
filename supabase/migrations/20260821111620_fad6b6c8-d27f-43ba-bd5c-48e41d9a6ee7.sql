ALTER TABLE public.dragon_lots ADD COLUMN IF NOT EXISTS parent_lot_id uuid REFERENCES public.dragon_lots(id) ON DELETE SET NULL;
ALTER TABLE public.dragon_lots ADD COLUMN IF NOT EXISTS origin text;

CREATE OR REPLACE FUNCTION public.dragon_lot_balance(p_lot_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(CASE WHEN sign = 'PLUS' THEN quantity ELSE -quantity END), 0)
  FROM public.dragon_lot_movements
  WHERE lot_id = p_lot_id;
$$;

CREATE OR REPLACE FUNCTION public.dragon_split_lot_atomic(
  p_lot_id uuid,
  p_quantity numeric,
  p_new_lot_code text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lot public.dragon_lots%ROWTYPE;
  v_balance numeric;
  v_new_lot_id uuid;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantita non valida';
  END IF;

  SELECT * INTO v_lot FROM public.dragon_lots WHERE id = p_lot_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lotto non trovato';
  END IF;

  IF NOT public.can_access_tenant(v_lot.company_id) THEN
    RAISE EXCEPTION 'Accesso negato al lotto';
  END IF;

  v_balance := public.dragon_lot_balance(p_lot_id);
  IF v_balance < p_quantity THEN
    RAISE EXCEPTION 'Saldo lotto insufficiente: disponibili % kg', v_balance;
  END IF;

  INSERT INTO public.dragon_lots (company_id, item_id, lot_code, production_date, warehouse_scope, status, notes, created_by, parent_lot_id, origin)
  VALUES (v_lot.company_id, v_lot.item_id, p_new_lot_code, CURRENT_DATE, v_lot.warehouse_scope, 'ATTIVO', p_notes, auth.uid(), v_lot.id, 'SPLIT')
  RETURNING id INTO v_new_lot_id;

  INSERT INTO public.dragon_lot_movements (company_id, lot_id, item_id, quantity, sign, note, created_by)
  VALUES (v_lot.company_id, v_lot.id, v_lot.item_id, p_quantity, 'MINUS', 'Divisione verso lotto ' || p_new_lot_code, auth.uid());

  INSERT INTO public.dragon_lot_movements (company_id, lot_id, item_id, quantity, sign, note, created_by)
  VALUES (v_lot.company_id, v_new_lot_id, v_lot.item_id, p_quantity, 'PLUS', 'Divisione da lotto ' || v_lot.lot_code, auth.uid());

  RETURN v_new_lot_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.dragon_merge_lots_atomic(
  p_source_lot_ids uuid[],
  p_target_lot_code text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first public.dragon_lots%ROWTYPE;
  v_lot public.dragon_lots%ROWTYPE;
  v_balance numeric;
  v_target_id uuid;
  v_id uuid;
BEGIN
  IF p_source_lot_ids IS NULL OR array_length(p_source_lot_ids, 1) < 2 THEN
    RAISE EXCEPTION 'Servono almeno due lotti da accorpare';
  END IF;

  SELECT * INTO v_first FROM public.dragon_lots WHERE id = p_source_lot_ids[1] FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lotto non trovato';
  END IF;
  IF NOT public.can_access_tenant(v_first.company_id) THEN
    RAISE EXCEPTION 'Accesso negato al lotto';
  END IF;

  INSERT INTO public.dragon_lots (company_id, item_id, lot_code, production_date, warehouse_scope, status, notes, created_by, parent_lot_id, origin)
  VALUES (v_first.company_id, v_first.item_id, p_target_lot_code, CURRENT_DATE, v_first.warehouse_scope, 'ATTIVO', p_notes, auth.uid(), v_first.id, 'MERGE')
  RETURNING id INTO v_target_id;

  FOREACH v_id IN ARRAY p_source_lot_ids LOOP
    SELECT * INTO v_lot FROM public.dragon_lots WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lotto % non trovato', v_id;
    END IF;
    IF v_lot.company_id <> v_first.company_id THEN
      RAISE EXCEPTION 'I lotti appartengono ad aziende diverse';
    END IF;
    IF v_lot.item_id <> v_first.item_id THEN
      RAISE EXCEPTION 'I lotti devono avere lo stesso codice CER';
    END IF;

    v_balance := public.dragon_lot_balance(v_id);
    IF v_balance <= 0 THEN
      RAISE EXCEPTION 'Il lotto % non ha giacenza da accorpare', v_lot.lot_code;
    END IF;

    INSERT INTO public.dragon_lot_movements (company_id, lot_id, item_id, quantity, sign, note, created_by)
    VALUES (v_lot.company_id, v_lot.id, v_lot.item_id, v_balance, 'MINUS', 'Accorpamento in lotto ' || p_target_lot_code, auth.uid());

    INSERT INTO public.dragon_lot_movements (company_id, lot_id, item_id, quantity, sign, note, created_by)
    VALUES (v_lot.company_id, v_target_id, v_lot.item_id, v_balance, 'PLUS', 'Accorpamento da lotto ' || v_lot.lot_code, auth.uid());

    UPDATE public.dragon_lots SET status = 'CHIUSO', updated_at = now() WHERE id = v_id;
  END LOOP;

  RETURN v_target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.dragon_split_lot_atomic(uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dragon_merge_lots_atomic(uuid[], text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dragon_lot_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dragon_split_lot_atomic(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dragon_merge_lots_atomic(uuid[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dragon_lot_balance(uuid) TO authenticated;