
-- Function to route completed FIR to the matching impianto account
CREATE OR REPLACE FUNCTION public.route_fir_to_impianto_inbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dest_name text;
  v_account_id uuid;
BEGIN
  -- Only trigger when status changes to completato
  IF NEW.status = 'completato' AND (OLD.status IS NULL OR OLD.status <> 'completato') THEN
    v_dest_name := lower(trim(COALESCE(NEW.destinatario_denominazione, '')));
    
    IF v_dest_name <> '' THEN
      -- Find matching impianto account by ragione_sociale (case-insensitive partial match)
      SELECT id INTO v_account_id
      FROM public.impianti_accounts
      WHERE lower(ragione_sociale) = v_dest_name
         OR v_dest_name LIKE '%' || lower(ragione_sociale) || '%'
         OR lower(ragione_sociale) LIKE '%' || v_dest_name || '%'
      LIMIT 1;

      IF v_account_id IS NOT NULL THEN
        INSERT INTO public.impianto_fir_inbox (impianto_account_id, fir_form_id, tenant_id)
        VALUES (v_account_id, NEW.id, NEW.tenant_id)
        ON CONFLICT (fir_form_id, impianto_account_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to fir_forms
CREATE TRIGGER route_completed_fir_to_impianto
  AFTER UPDATE ON public.fir_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.route_fir_to_impianto_inbox();
