
CREATE TABLE IF NOT EXISTS public.registro_generale (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  numero_interno integer,
  numero_movimento text,
  data_movimento date,
  cer text,
  descrizione text,
  carico_scarico text,
  tipo_operazione text,
  al_rentri boolean DEFAULT false,
  numero_formulario text,
  segno text,
  quantita numeric,
  peso_destino numeric,
  qta_scaricata numeric,
  data_ricezione date,
  luogo_produzione text,
  destinazione text,
  classi_pericolo text,
  stato_fisico text,
  cod_magazzino text,
  peso_lordo numeric,
  tara numeric,
  annotazioni text,
  origine_rifiuto text,
  pseudonimo_cantiere text,
  indirizzo_cantiere text,
  cap_cantiere text,
  comune_cantiere text,
  provincia_cantiere text,
  data_emissione_formulario date,
  respinto text,
  raw jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_registro_generale_tenant ON public.registro_generale(tenant_id);
CREATE INDEX IF NOT EXISTS idx_registro_generale_data ON public.registro_generale(data_movimento DESC);
CREATE INDEX IF NOT EXISTS idx_registro_generale_cer ON public.registro_generale(cer);
ALTER TABLE public.registro_generale ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registro_generale_select_all" ON public.registro_generale FOR SELECT TO authenticated USING (true);
CREATE POLICY "registro_generale_insert_all" ON public.registro_generale FOR INSERT TO authenticated WITH CHECK (true);
