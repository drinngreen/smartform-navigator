
ALTER TABLE public.privati_conferimenti
  ADD COLUMN IF NOT EXISTS numero_progressivo integer,
  ADD COLUMN IF NOT EXISTS anno_dbt integer;

CREATE UNIQUE INDEX IF NOT EXISTS privati_conferimenti_dbt_progressivo_uniq
  ON public.privati_conferimenti (tenant_id, anno_dbt, numero_progressivo)
  WHERE numero_progressivo IS NOT NULL;

CREATE OR REPLACE FUNCTION public.next_progressivo_dbt(p_tenant_id uuid, p_anno integer)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(numero_progressivo), 0) + 1
  FROM public.privati_conferimenti
  WHERE tenant_id = p_tenant_id AND anno_dbt = p_anno;
$$;

CREATE OR REPLACE FUNCTION public.assign_dbt_progressivo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anno integer;
BEGIN
  IF NEW.numero_progressivo IS NULL THEN
    v_anno := COALESCE(NEW.anno_dbt, EXTRACT(YEAR FROM COALESCE(NEW.data, now()))::integer);
    NEW.anno_dbt := v_anno;
    NEW.numero_progressivo := public.next_progressivo_dbt(NEW.tenant_id, v_anno);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_dbt_progressivo ON public.privati_conferimenti;
CREATE TRIGGER trg_assign_dbt_progressivo
  BEFORE INSERT ON public.privati_conferimenti
  FOR EACH ROW EXECUTE FUNCTION public.assign_dbt_progressivo();

-- Backfill existing rows
WITH ordered AS (
  SELECT id, tenant_id,
         EXTRACT(YEAR FROM data)::integer AS y,
         ROW_NUMBER() OVER (
           PARTITION BY tenant_id, EXTRACT(YEAR FROM data)::integer
           ORDER BY data ASC, created_at ASC
         ) AS rn
  FROM public.privati_conferimenti
  WHERE numero_progressivo IS NULL
)
UPDATE public.privati_conferimenti pc
SET numero_progressivo = o.rn,
    anno_dbt = o.y
FROM ordered o
WHERE pc.id = o.id;
