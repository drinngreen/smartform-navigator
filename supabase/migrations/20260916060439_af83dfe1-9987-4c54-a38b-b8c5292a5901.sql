-- Token opaco per il QR pubblico di verifica (visibile a vigili/polizia)
ALTER TABLE public.fir_forms ADD COLUMN IF NOT EXISTS qr_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS fir_forms_qr_token_idx ON public.fir_forms (qr_token);

CREATE OR REPLACE FUNCTION public.fir_pubblico_sintesi(_token uuid)
RETURNS TABLE (
  numero_fir text,
  produttore text,
  trasportatore text,
  destinatario text,
  codice_eer text,
  descrizione_rifiuto text,
  quantita numeric,
  unita_misura text,
  stato_fisico text,
  stato_formulario text,
  data_emissione timestamptz,
  data_inizio_trasporto text,
  targa text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.numero_fir,
    f.produttore_denominazione,
    f.trasportatore_denominazione,
    f.destinatario_denominazione,
    f.codice_eer,
    f.descrizione_rifiuto,
    f.quantita,
    f.unita_misura,
    f.stato_fisico,
    f.status,
    f.created_at,
    COALESCE(f.form_data->>'data_inizio_trasporto', '') AS data_inizio_trasporto,
    COALESCE(f.form_data->>'trasportatore_targa_automezzo', '') AS targa
  FROM public.fir_forms f
  WHERE f.qr_token = _token
    AND f.deleted_by_user = false
    AND f.status IN ('inviato', 'completato', 'bozza');
$$;

GRANT EXECUTE ON FUNCTION public.fir_pubblico_sintesi(uuid) TO anon, authenticated;
GRANT ALL ON public.fir_forms TO service_role;