ALTER TABLE public.privati_conferimenti ADD COLUMN IF NOT EXISTS annullato_at timestamptz, ADD COLUMN IF NOT EXISTS annullato_da uuid, ADD COLUMN IF NOT EXISTS motivo_annullamento text;
ALTER TABLE public.ricevute_privati ADD COLUMN IF NOT EXISTS annullato_at timestamptz, ADD COLUMN IF NOT EXISTS annullato_da uuid, ADD COLUMN IF NOT EXISTS motivo_annullamento text;
CREATE OR REPLACE VIEW public.privati_conferimenti_attivi WITH (security_invoker=true) AS SELECT * FROM public.privati_conferimenti WHERE annullato_at IS NULL;
CREATE OR REPLACE VIEW public.ricevute_privati_attive WITH (security_invoker=true) AS SELECT * FROM public.ricevute_privati WHERE annullato_at IS NULL;
GRANT SELECT ON public.privati_conferimenti_attivi,public.ricevute_privati_attive TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.annulla_conferimenti_privati(p_ids uuid[],p_motivo text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; n integer:=0; kg numeric:=0; ts timestamptz:=now();
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Accesso richiesto'; END IF;
 IF coalesce(cardinality(p_ids),0)=0 OR cardinality(p_ids)>100 OR length(btrim(coalesce(p_motivo,'')))<3 THEN RAISE EXCEPTION 'Conferimenti e motivo obbligatori'; END IF;
 IF (SELECT count(*) FROM public.privati_conferimenti WHERE id=ANY(p_ids)) <> cardinality(p_ids) THEN RAISE EXCEPTION 'Conferimenti mancanti o duplicati'; END IF;
 FOR c IN SELECT * FROM public.privati_conferimenti WHERE id=ANY(p_ids) ORDER BY id FOR UPDATE LOOP
  IF c.tenant_id IS DISTINCT FROM '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid OR NOT public.can_access_tenant(c.tenant_id) THEN RAISE EXCEPTION 'Operazione non autorizzata'; END IF;
  IF c.data::date <= DATE '2026-09-21' THEN RAISE EXCEPTION 'Le giacenze fino al 21/09/2026 sono immutabili'; END IF;
  IF c.annullato_at IS NOT NULL THEN CONTINUE; END IF;
  IF EXISTS(SELECT 1 FROM public.rentri_invii_privati WHERE conferimento_id=c.id) THEN RAISE EXCEPTION 'Conferimento inviato al RENTRI: occorre rettifica separata'; END IF;
  IF (SELECT count(*) FROM public.ricevute_privati WHERE conferimento_id=c.id)<>1 OR (SELECT count(*) FROM public.movimenti_impianto WHERE privati_conferimento_id=c.id)<>1 THEN RAISE EXCEPTION 'Collegamenti incompleti: annullamento bloccato'; END IF;
  PERFORM set_config('app.inventory_authorized','on',true);
  UPDATE public.privati_conferimenti SET annullato_at=ts,annullato_da=auth.uid(),motivo_annullamento=btrim(p_motivo) WHERE id=c.id;
  UPDATE public.ricevute_privati SET annullato_at=ts,annullato_da=auth.uid(),motivo_annullamento=btrim(p_motivo) WHERE conferimento_id=c.id;
  UPDATE public.movimenti_impianto SET stato_movimento='annullato',updated_at=ts WHERE privati_conferimento_id=c.id;
  n:=n+1; kg:=kg+c.kg_pesati;
 END LOOP;
 RETURN jsonb_build_object('annullati',n,'kg_stornati',kg);
END; $$;
REVOKE ALL ON FUNCTION public.annulla_conferimenti_privati(uuid[],text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.annulla_conferimenti_privati(uuid[],text) TO authenticated;
CREATE OR REPLACE FUNCTION public.proteggi_conferimento_annullato() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF OLD.annullato_at IS NOT NULL THEN RAISE EXCEPTION 'Conferimento annullato: non modificabile'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER trg_proteggi_conferimento_annullato BEFORE UPDATE ON public.privati_conferimenti FOR EACH ROW EXECUTE FUNCTION public.proteggi_conferimento_annullato();