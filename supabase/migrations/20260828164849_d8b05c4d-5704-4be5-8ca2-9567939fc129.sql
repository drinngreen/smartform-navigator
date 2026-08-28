CREATE UNIQUE INDEX IF NOT EXISTS ricevute_privati_conferimento_uidx
  ON public.ricevute_privati (conferimento_id);

CREATE OR REPLACE FUNCTION public.ricevuta_numero_da_movimento(p_progressivo integer, p_anno integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$ SELECT lpad(COALESCE(p_progressivo,0)::text, 5, '0') || '/' || COALESCE(p_anno, 0)::text $$;

REVOKE EXECUTE ON FUNCTION public.privato_allinea_data_registrazione() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_ricevuta_da_conferimento() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ricevuta_forza_coerenza_movimento() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ricevuta_blocca_eliminazione_isolata() FROM anon, authenticated;