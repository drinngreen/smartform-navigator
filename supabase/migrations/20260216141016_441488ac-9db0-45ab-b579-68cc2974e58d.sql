
CREATE OR REPLACE FUNCTION public.auto_distribute_fir_numbers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_fir_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_user_id IN
    SELECT p.user_id
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM fir_number_pool f WHERE f.user_id = p.user_id
    )
  LOOP
    -- Pick one available number from the global pool
    SELECT id INTO v_fir_id
    FROM fir_number_pool
    WHERE status = 'available' AND societa_id = 'global'
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_fir_id IS NOT NULL THEN
      UPDATE fir_number_pool
      SET user_id = v_user_id,
          assigned_at = now()
      WHERE id = v_fir_id;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;
