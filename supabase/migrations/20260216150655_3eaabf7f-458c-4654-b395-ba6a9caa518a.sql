-- Disable the auto-generation of fake FIR numbers
-- Replace the function with a no-op so it doesn't create FIR- prefixed numbers
CREATE OR REPLACE FUNCTION public.generate_fir_numbers_for_user(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Disabled: FIR numbers are only provided by RENTRI via vidimazione.
  -- This function previously generated fake FIR-YYYY-XXXXXX numbers.
  NULL;
END;
$function$;

-- Also disable admin_assign_fir_numbers which generates fake numbers
CREATE OR REPLACE FUNCTION public.admin_assign_fir_numbers(p_target_user_id uuid, p_count integer, p_assigned_by uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Disabled: FIR numbers come only from RENTRI vidimazione.
  RETURN 0;
END;
$function$;
