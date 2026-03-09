
-- Fix the trigger to match tenant_id when routing FIR to impianto inbox
CREATE OR REPLACE FUNCTION public.route_fir_to_impianto_inbox()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dest_name text;
  v_account_id uuid;
BEGIN
  -- Only trigger when status changes to completato
  IF NEW.status = 'completato' AND (OLD.status IS NULL OR OLD.status <> 'completato') THEN
    v_dest_name := lower(trim(COALESCE(NEW.destinatario_denominazione, '')));
    
    IF v_dest_name <> '' THEN
      -- Find matching impianto account by ragione_sociale AND tenant_id
      SELECT id INTO v_account_id
      FROM public.impianti_accounts
      WHERE tenant_id = NEW.tenant_id
        AND (
          lower(ragione_sociale) = v_dest_name
          OR v_dest_name LIKE '%' || lower(ragione_sociale) || '%'
          OR lower(ragione_sociale) LIKE '%' || v_dest_name || '%'
        )
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
$function$;
