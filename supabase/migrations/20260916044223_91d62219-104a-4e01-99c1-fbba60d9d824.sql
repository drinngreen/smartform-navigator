CREATE TABLE IF NOT EXISTS public.giacenze_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  giacenza_id uuid,
  tenant_id uuid,
  impianto_id uuid,
  cer text,
  qty_prima numeric,
  qty_dopo numeric,
  delta numeric,
  operazione text NOT NULL,
  origine text,
  attore text NOT NULL DEFAULT 'human',
  actor_user_id uuid,
  documento text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.giacenze_audit_log TO authenticated;
GRANT ALL ON public.giacenze_audit_log TO service_role;

ALTER TABLE public.giacenze_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit log leggibile agli autenticati"
ON public.giacenze_audit_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "audit log inseribile dal sistema"
ON public.giacenze_audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_giacenze_audit_log_created_at ON public.giacenze_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_giacenze_audit_log_cer ON public.giacenze_audit_log (cer);

CREATE OR REPLACE FUNCTION public.log_giacenza_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prima numeric;
  v_dopo numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_prima := 0;
    v_dopo := NEW.quantita_kg;
  ELSIF TG_OP = 'UPDATE' THEN
    v_prima := OLD.quantita_kg;
    v_dopo := NEW.quantita_kg;
    IF v_prima IS NOT DISTINCT FROM v_dopo THEN
      RETURN NEW;
    END IF;
  ELSE
    v_prima := OLD.quantita_kg;
    v_dopo := 0;
  END IF;

  INSERT INTO public.giacenze_audit_log (
    giacenza_id, tenant_id, impianto_id, cer,
    qty_prima, qty_dopo, delta, operazione,
    origine, attore, actor_user_id
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    COALESCE(NEW.impianto_id, OLD.impianto_id),
    COALESCE(NEW.cer, OLD.cer),
    v_prima, v_dopo, COALESCE(v_dopo, 0) - COALESCE(v_prima, 0), TG_OP,
    current_setting('app.giacenza_origine', true),
    COALESCE(NULLIF(current_setting('app.giacenza_attore', true), ''), CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'human' END),
    auth.uid()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_giacenza_change ON public.magazzino_giacenze;
CREATE TRIGGER trg_log_giacenza_change
AFTER INSERT OR UPDATE OR DELETE ON public.magazzino_giacenze
FOR EACH ROW EXECUTE FUNCTION public.log_giacenza_change();

ALTER TABLE public.registro_generale
  ADD COLUMN IF NOT EXISTS stato_movimento text NOT NULL DEFAULT 'effettivo',
  ADD COLUMN IF NOT EXISTS created_by_agent boolean NOT NULL DEFAULT false;

ALTER TABLE public.movimenti_impianto
  ADD COLUMN IF NOT EXISTS stato_movimento text NOT NULL DEFAULT 'effettivo',
  ADD COLUMN IF NOT EXISTS created_by_agent boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_registro_generale_stato_movimento ON public.registro_generale (stato_movimento);
CREATE INDEX IF NOT EXISTS idx_movimenti_impianto_stato_movimento ON public.movimenti_impianto (stato_movimento);