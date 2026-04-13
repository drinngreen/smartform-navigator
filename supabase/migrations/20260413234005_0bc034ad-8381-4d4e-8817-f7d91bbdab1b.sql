
-- 1. Create dragon_warehouses table
CREATE TABLE public.dragon_warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  has_cer BOOLEAN NOT NULL DEFAULT false,
  has_mps BOOLEAN NOT NULL DEFAULT false,
  limit_mps_eow NUMERIC DEFAULT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

ALTER TABLE public.dragon_warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read dragon_warehouses"
  ON public.dragon_warehouses FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert dragon_warehouses"
  ON public.dragon_warehouses FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update dragon_warehouses"
  ON public.dragon_warehouses FOR UPDATE TO authenticated
  USING (true);

CREATE TRIGGER update_dragon_warehouses_updated_at
  BEFORE UPDATE ON public.dragon_warehouses
  FOR EACH ROW EXECUTE FUNCTION public.dragon_update_updated_at();

-- 2. Add columns to dragon_items
ALTER TABLE public.dragon_items
  ADD COLUMN IF NOT EXISTS fattore_conversione NUMERIC NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tipo_mps_eow TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tipo_mps_eow_desc TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_warehouse_id UUID DEFAULT NULL REFERENCES public.dragon_warehouses(id);

-- 3. Add warehouse_id to dragon_stock_movements
ALTER TABLE public.dragon_stock_movements
  ADD COLUMN IF NOT EXISTS warehouse_id UUID DEFAULT NULL REFERENCES public.dragon_warehouses(id);
