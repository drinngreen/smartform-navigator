
CREATE OR REPLACE FUNCTION public.auto_assign_after_consume(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fir_id uuid;
  v_fir_number text;
  v_remaining integer;
BEGIN
  -- Pick one available number from the global pool that is NOT already assigned to this user
  SELECT id, fir_number INTO v_fir_id, v_fir_number
  FROM fir_number_pool
  WHERE status = 'available' 
    AND societa_id = 'global'
    AND user_id != p_user_id
    AND suspended = false
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_fir_id IS NOT NULL THEN
    UPDATE fir_number_pool
    SET user_id = p_user_id,
        assigned_at = now()
    WHERE id = v_fir_id;
  END IF;

  -- Count remaining available numbers globally
  SELECT count(*) INTO v_remaining
  FROM fir_number_pool
  WHERE status = 'available' AND societa_id = 'global' AND suspended = false;

  -- Return info: assigned number (or null) + remaining count
  RETURN COALESCE(v_fir_number, '') || '|' || v_remaining::text;
END;
$$;
