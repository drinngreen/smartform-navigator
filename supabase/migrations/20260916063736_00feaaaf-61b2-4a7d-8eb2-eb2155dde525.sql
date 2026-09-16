CREATE OR REPLACE FUNCTION public.recalculate_stock_after_plant_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_key bigint;
  v_new_key bigint;
  v_authorized text := COALESCE(current_setting('app.inventory_authorized', true), '');
  v_old_effective boolean := TG_OP <> 'INSERT' AND COALESCE(OLD.stato_movimento, 'effettivo') = 'effettivo';
  v_new_effective boolean := TG_OP <> 'DELETE' AND COALESCE(NEW.stato_movimento, 'effettivo') = 'effettivo';
BEGIN
  IF NOT v_old_effective AND NOT v_new_effective THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF v_authorized <> 'on' THEN
    RAISE EXCEPTION 'BUG: variazione giacenza fuori dal percorso autorizzato';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old_key := public.inventory_lock_key(OLD.tenant_id, OLD.impianto_id, OLD.cer);
    v_new_key := public.inventory_lock_key(NEW.tenant_id, NEW.impianto_id, NEW.cer);
    IF v_old_key <= v_new_key THEN
      PERFORM pg_advisory_xact_lock(v_old_key);
      IF v_new_key <> v_old_key THEN PERFORM pg_advisory_xact_lock(v_new_key); END IF;
    ELSE
      PERFORM pg_advisory_xact_lock(v_new_key);
      PERFORM pg_advisory_xact_lock(v_old_key);
    END IF;
    IF v_old_effective THEN PERFORM public.recalculate_magazzino_giacenza(OLD.tenant_id, OLD.impianto_id, OLD.cer); END IF;
    IF v_new_effective AND (NOT v_old_effective OR v_new_key <> v_old_key) THEN
      PERFORM public.recalculate_magazzino_giacenza(NEW.tenant_id, NEW.impianto_id, NEW.cer);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_magazzino_giacenza(OLD.tenant_id, OLD.impianto_id, OLD.cer);
  ELSE
    PERFORM public.recalculate_magazzino_giacenza(NEW.tenant_id, NEW.impianto_id, NEW.cer);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE POLICY "Users can prepare potential movements for their tenant"
ON public.movimenti_impianto FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant(auth.uid())
  AND stato_movimento = 'potenziale'
);

CREATE POLICY "Admins can prepare Multy Niyol potential movements"
ON public.movimenti_impianto FOR INSERT TO authenticated
WITH CHECK (
  public.is_multy_niyol_admin()
  AND public.is_allowed_multy_niyol_tenant(tenant_id)
  AND stato_movimento = 'potenziale'
);

CREATE POLICY "Users can edit only potential movements for their tenant"
ON public.movimenti_impianto FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_user_tenant(auth.uid())
  AND stato_movimento = 'potenziale'
)
WITH CHECK (
  tenant_id = public.get_user_tenant(auth.uid())
  AND stato_movimento = 'potenziale'
);

CREATE POLICY "Admins can edit only Multy Niyol potential movements"
ON public.movimenti_impianto FOR UPDATE TO authenticated
USING (
  public.is_multy_niyol_admin()
  AND public.is_allowed_multy_niyol_tenant(tenant_id)
  AND stato_movimento = 'potenziale'
)
WITH CHECK (
  public.is_multy_niyol_admin()
  AND public.is_allowed_multy_niyol_tenant(tenant_id)
  AND stato_movimento = 'potenziale'
);