
CREATE TABLE IF NOT EXISTS public.noleggi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.anagrafica_aziende_mp(id) ON DELETE SET NULL,
  cliente_ragione_sociale text NOT NULL,
  cliente_partita_iva text,
  cassone_id text,
  cassone_descrizione text,
  tariffa_mensile numeric(12,2) NOT NULL DEFAULT 0,
  mese_riferimento date NOT NULL,
  fatturato_stato text NOT NULL DEFAULT 'da_fatturare' CHECK (fatturato_stato IN ('da_fatturare','fatturato','annullato')),
  fattura_id uuid REFERENCES public.fatture(id) ON DELETE SET NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS noleggi_tenant_mese_idx ON public.noleggi (tenant_id, mese_riferimento);
CREATE INDEX IF NOT EXISTS noleggi_stato_idx ON public.noleggi (tenant_id, fatturato_stato);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.noleggi TO authenticated;
GRANT ALL ON public.noleggi TO service_role;
ALTER TABLE public.noleggi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Multy/Niyol admins gestiscono noleggi"
  ON public.noleggi FOR ALL TO authenticated
  USING (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id))
  WITH CHECK (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id));

CREATE POLICY "Admin gestisce noleggi"
  ON public.noleggi FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_noleggi_updated_at
  BEFORE UPDATE ON public.noleggi
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
DECLARE v_tenant uuid := '77ec9a3d-602e-438f-97bf-1c69abd8f691';
BEGIN
  -- IVA
  INSERT INTO public.erp_codici_iva (tenant_id, codice, descrizione, aliquota, natura, attivo)
  SELECT v_tenant, '22', 'IVA 22% ordinaria', 22, NULL, true
  WHERE NOT EXISTS (SELECT 1 FROM public.erp_codici_iva WHERE tenant_id=v_tenant AND codice='22');
  INSERT INTO public.erp_codici_iva (tenant_id, codice, descrizione, aliquota, natura, attivo)
  SELECT v_tenant, '10', 'IVA 10% ridotta', 10, NULL, true
  WHERE NOT EXISTS (SELECT 1 FROM public.erp_codici_iva WHERE tenant_id=v_tenant AND codice='10');
  INSERT INTO public.erp_codici_iva (tenant_id, codice, descrizione, aliquota, natura, attivo)
  SELECT v_tenant, 'N6.1', 'Reverse charge rottami art.74', 0, 'N6.1', true
  WHERE NOT EXISTS (SELECT 1 FROM public.erp_codici_iva WHERE tenant_id=v_tenant AND codice='N6.1');

  -- Causali (tipo enum: FV=Fattura vendita, NC=Nota credito, PA=Pagamento)
  INSERT INTO public.erp_causali_contabili (tenant_id, codice, descrizione, tipo, attivo)
  SELECT v_tenant, 'FTV', 'Fattura di vendita', 'FV', true
  WHERE NOT EXISTS (SELECT 1 FROM public.erp_causali_contabili WHERE tenant_id=v_tenant AND codice='FTV');
  INSERT INTO public.erp_causali_contabili (tenant_id, codice, descrizione, tipo, attivo)
  SELECT v_tenant, 'FTV-NOL', 'Fattura noleggio cassoni', 'FV', true
  WHERE NOT EXISTS (SELECT 1 FROM public.erp_causali_contabili WHERE tenant_id=v_tenant AND codice='FTV-NOL');

  -- Piano conti (tipo enum: attivo, passivo, costo, ricavo, ordine)
  INSERT INTO public.erp_piano_conti (tenant_id, codice, descrizione, tipo, livello, is_movimentabile)
  SELECT v_tenant, '20.10.001', 'Crediti verso clienti', 'attivo', 2, true
  WHERE NOT EXISTS (SELECT 1 FROM public.erp_piano_conti WHERE tenant_id=v_tenant AND codice='20.10.001');
  INSERT INTO public.erp_piano_conti (tenant_id, codice, descrizione, tipo, livello, is_movimentabile)
  SELECT v_tenant, '40.10.001', 'Ricavi da servizi smaltimento', 'ricavo', 2, true
  WHERE NOT EXISTS (SELECT 1 FROM public.erp_piano_conti WHERE tenant_id=v_tenant AND codice='40.10.001');
  INSERT INTO public.erp_piano_conti (tenant_id, codice, descrizione, tipo, livello, is_movimentabile)
  SELECT v_tenant, '40.10.002', 'Ricavi noleggio cassoni', 'ricavo', 2, true
  WHERE NOT EXISTS (SELECT 1 FROM public.erp_piano_conti WHERE tenant_id=v_tenant AND codice='40.10.002');
  INSERT INTO public.erp_piano_conti (tenant_id, codice, descrizione, tipo, livello, is_movimentabile)
  SELECT v_tenant, '25.20.001', 'IVA a debito', 'passivo', 2, true
  WHERE NOT EXISTS (SELECT 1 FROM public.erp_piano_conti WHERE tenant_id=v_tenant AND codice='25.20.001');
END$$;
