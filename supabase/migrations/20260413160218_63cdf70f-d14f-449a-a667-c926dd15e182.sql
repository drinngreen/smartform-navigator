
-- ============================================================
-- DRAGON RIFIUTI 2 — COMPLETE SCHEMA
-- ============================================================

-- ===================== ENUMS =====================

DO $$ BEGIN
  CREATE TYPE dragon_item_type AS ENUM ('WASTE_CER', 'MPS', 'MATERIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_cause_scope AS ENUM ('REGISTER', 'STOCK', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_cause_direction AS ENUM ('IN', 'OUT', 'TRANSFORM', 'ADJUST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_stock_sign AS ENUM ('PLUS', 'MINUS', 'NONE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_movement_type AS ENUM ('CARICO', 'SCARICO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_sign AS ENUM ('PLUS', 'MINUS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_movement_status AS ENUM ('BOZZA', 'CONSOLIDATO', 'STAMPATO', 'DA_NON_STAMPARE', 'DA_NON_INVIARE_RENTRI', 'INVIATO_RENTRI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_weight_status AS ENUM ('DEFINITIVO', 'DA_VERIFICARE_A_DESTINO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_source_context AS ENUM ('UL', 'FUORI_UL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_document_type AS ENUM ('FIR', 'DDT_IN', 'DDT_OUT', 'FORMULARIO_MODELLO', 'ALTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_subject_type AS ENUM ('PRODUTTORE', 'DESTINATARIO', 'TRASPORTATORE', 'INTERMEDIARIO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_site_activity AS ENUM ('ND', 'MANUTENZIONE', 'ASSISTENZA_SANITARIA', 'CANTIERE_TEMPORANEO_MOBILE', 'BONIFICA_AMIANTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_batch_status AS ENUM ('BOZZA', 'CONFERMATA', 'ANNULLATA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_warehouse_scope AS ENUM ('WASTE', 'MPS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_quantity_mode AS ENUM ('PERCENT', 'FIXED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_adjustment_type AS ENUM ('POSITIVE', 'NEGATIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dragon_audit_action AS ENUM ('CREATE', 'UPDATE', 'SOFT_DELETE', 'RESTORE', 'CONFIRM', 'CANCEL', 'ADJUST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===================== TABLE 1: dragon_items =====================

CREATE TABLE public.dragon_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  codice_cer text NOT NULL,
  descrizione text NOT NULL,
  pericoloso boolean NOT NULL DEFAULT false,
  classi_hp text[] DEFAULT '{}',
  stato_fisico_default text,
  unita_misura_default text NOT NULL DEFAULT 'kg',
  item_type dragon_item_type NOT NULL DEFAULT 'WASTE_CER',
  attivo boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dragon_items_company ON public.dragon_items(company_id);
CREATE INDEX idx_dragon_items_cer ON public.dragon_items(codice_cer);
CREATE UNIQUE INDEX idx_dragon_items_company_cer ON public.dragon_items(company_id, codice_cer) WHERE attivo = true;

ALTER TABLE public.dragon_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dragon_items_select" ON public.dragon_items FOR SELECT TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_items_insert" ON public.dragon_items FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_items_update" ON public.dragon_items FOR UPDATE TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- ===================== TABLE 2: dragon_causes =====================

CREATE TABLE public.dragon_causes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  scope dragon_cause_scope NOT NULL DEFAULT 'BOTH',
  direction dragon_cause_direction NOT NULL DEFAULT 'IN',
  requires_fir boolean NOT NULL DEFAULT false,
  requires_site boolean NOT NULL DEFAULT false,
  requires_source_movement boolean NOT NULL DEFAULT false,
  generates_stock_movement boolean NOT NULL DEFAULT true,
  stock_sign dragon_stock_sign NOT NULL DEFAULT 'PLUS',
  default_document_type dragon_document_type,
  active boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dragon_causes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dragon_causes_select" ON public.dragon_causes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "dragon_causes_manage" ON public.dragon_causes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ===================== TABLE 3: dragon_production_sites =====================

CREATE TABLE public.dragon_production_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  site_code text NOT NULL,
  name text NOT NULL,
  address text,
  municipality text,
  province text,
  notes text,
  activity_type dragon_site_activity NOT NULL DEFAULT 'ND',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_dragon_sites_company_code ON public.dragon_production_sites(company_id, site_code);
CREATE INDEX idx_dragon_sites_company ON public.dragon_production_sites(company_id);

ALTER TABLE public.dragon_production_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dragon_sites_select" ON public.dragon_production_sites FOR SELECT TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_sites_insert" ON public.dragon_production_sites FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_sites_update" ON public.dragon_production_sites FOR UPDATE TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- ===================== TABLE 4: dragon_registers =====================

CREATE TABLE public.dragon_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  register_code text NOT NULL,
  description text,
  subject_type dragon_subject_type NOT NULL DEFAULT 'PRODUTTORE',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_dragon_registers_company_code ON public.dragon_registers(company_id, register_code);

ALTER TABLE public.dragon_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dragon_registers_select" ON public.dragon_registers FOR SELECT TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_registers_insert" ON public.dragon_registers FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_registers_update" ON public.dragon_registers FOR UPDATE TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- ===================== TABLE 5: dragon_documents =====================

CREATE TABLE public.dragon_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  document_type dragon_document_type NOT NULL DEFAULT 'ALTRO',
  number text,
  document_date date,
  counterparty_id uuid,
  notes text,
  status text NOT NULL DEFAULT 'attivo',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dragon_documents_company ON public.dragon_documents(company_id);
CREATE INDEX idx_dragon_documents_type ON public.dragon_documents(document_type);

ALTER TABLE public.dragon_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dragon_documents_select" ON public.dragon_documents FOR SELECT TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_documents_insert" ON public.dragon_documents FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_documents_update" ON public.dragon_documents FOR UPDATE TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- ===================== TABLE 6: dragon_register_movements =====================

CREATE TABLE public.dragon_register_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  register_id uuid REFERENCES public.dragon_registers(id),
  movement_number integer NOT NULL DEFAULT 0,
  internal_number text,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  recording_date date NOT NULL DEFAULT CURRENT_DATE,
  item_id uuid NOT NULL REFERENCES public.dragon_items(id),
  cer_code text NOT NULL,
  description_snapshot text,
  movement_type dragon_movement_type NOT NULL,
  cause_id uuid NOT NULL REFERENCES public.dragon_causes(id),
  quantity numeric NOT NULL DEFAULT 0,
  unit_of_measure text NOT NULL DEFAULT 'kg',
  sign dragon_sign NOT NULL,
  physical_state text,
  hp_codes text[] DEFAULT '{}',
  destination_type text,
  note text,
  annotations text,
  source_site_id uuid REFERENCES public.dragon_production_sites(id),
  source_context dragon_source_context NOT NULL DEFAULT 'UL',
  linked_document_id uuid REFERENCES public.dragon_documents(id),
  weight_status dragon_weight_status NOT NULL DEFAULT 'DEFINITIVO',
  status dragon_movement_status NOT NULL DEFAULT 'BOZZA',
  parent_movement_id uuid REFERENCES public.dragon_register_movements(id),
  source_transform_batch_id uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_dragon_reg_mov_company ON public.dragon_register_movements(company_id);
CREATE INDEX idx_dragon_reg_mov_date ON public.dragon_register_movements(movement_date);
CREATE INDEX idx_dragon_reg_mov_item ON public.dragon_register_movements(item_id);
CREATE INDEX idx_dragon_reg_mov_cause ON public.dragon_register_movements(cause_id);
CREATE INDEX idx_dragon_reg_mov_status ON public.dragon_register_movements(status);
CREATE INDEX idx_dragon_reg_mov_parent ON public.dragon_register_movements(parent_movement_id);
CREATE INDEX idx_dragon_reg_mov_batch ON public.dragon_register_movements(source_transform_batch_id);
CREATE INDEX idx_dragon_reg_mov_deleted ON public.dragon_register_movements(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE public.dragon_register_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dragon_reg_mov_select" ON public.dragon_register_movements FOR SELECT TO authenticated
  USING ((company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)) AND deleted_at IS NULL);

CREATE POLICY "dragon_reg_mov_insert" ON public.dragon_register_movements FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_reg_mov_update" ON public.dragon_register_movements FOR UPDATE TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- ===================== TABLE 7: dragon_stock_movements =====================

CREATE TABLE public.dragon_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.dragon_items(id),
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  cause_id uuid NOT NULL REFERENCES public.dragon_causes(id),
  quantity numeric NOT NULL DEFAULT 0,
  sign dragon_sign NOT NULL,
  warehouse_scope dragon_warehouse_scope NOT NULL DEFAULT 'WASTE',
  source_register_movement_id uuid REFERENCES public.dragon_register_movements(id),
  source_transform_batch_id uuid,
  source_document_id uuid REFERENCES public.dragon_documents(id),
  lot_reference text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dragon_stock_mov_company ON public.dragon_stock_movements(company_id);
CREATE INDEX idx_dragon_stock_mov_item ON public.dragon_stock_movements(item_id);
CREATE INDEX idx_dragon_stock_mov_scope ON public.dragon_stock_movements(warehouse_scope);
CREATE INDEX idx_dragon_stock_mov_reg ON public.dragon_stock_movements(source_register_movement_id);

ALTER TABLE public.dragon_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dragon_stock_mov_select" ON public.dragon_stock_movements FOR SELECT TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_stock_mov_insert" ON public.dragon_stock_movements FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- ===================== TABLE 8: dragon_movement_allocations =====================

CREATE TABLE public.dragon_movement_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  out_movement_id uuid NOT NULL REFERENCES public.dragon_register_movements(id),
  in_movement_id uuid NOT NULL REFERENCES public.dragon_register_movements(id),
  allocated_quantity numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dragon_alloc_out ON public.dragon_movement_allocations(out_movement_id);
CREATE INDEX idx_dragon_alloc_in ON public.dragon_movement_allocations(in_movement_id);

ALTER TABLE public.dragon_movement_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dragon_alloc_select" ON public.dragon_movement_allocations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dragon_register_movements rm
    WHERE rm.id = dragon_movement_allocations.out_movement_id
    AND (rm.company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "dragon_alloc_insert" ON public.dragon_movement_allocations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.dragon_register_movements rm
    WHERE rm.id = dragon_movement_allocations.out_movement_id
    AND (rm.company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));

-- ===================== TABLE 9: dragon_transform_models =====================

CREATE TABLE public.dragon_transform_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  input_item_id uuid NOT NULL REFERENCES public.dragon_items(id),
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dragon_tmodels_company ON public.dragon_transform_models(company_id);

ALTER TABLE public.dragon_transform_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dragon_tmodels_select" ON public.dragon_transform_models FOR SELECT TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_tmodels_insert" ON public.dragon_transform_models FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_tmodels_update" ON public.dragon_transform_models FOR UPDATE TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- ===================== TABLE 10: dragon_transform_model_outputs =====================

CREATE TABLE public.dragon_transform_model_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.dragon_transform_models(id) ON DELETE CASCADE,
  output_item_id uuid NOT NULL REFERENCES public.dragon_items(id),
  output_type dragon_item_type NOT NULL DEFAULT 'WASTE_CER',
  quantity_mode dragon_quantity_mode NOT NULL DEFAULT 'PERCENT',
  quantity_value numeric NOT NULL DEFAULT 0,
  warehouse_scope dragon_warehouse_scope NOT NULL DEFAULT 'WASTE',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dragon_tmodel_out_model ON public.dragon_transform_model_outputs(model_id);

ALTER TABLE public.dragon_transform_model_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dragon_tmodel_out_select" ON public.dragon_transform_model_outputs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dragon_transform_models m
    WHERE m.id = dragon_transform_model_outputs.model_id
    AND (m.company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "dragon_tmodel_out_insert" ON public.dragon_transform_model_outputs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.dragon_transform_models m
    WHERE m.id = dragon_transform_model_outputs.model_id
    AND (m.company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "dragon_tmodel_out_update" ON public.dragon_transform_model_outputs FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dragon_transform_models m
    WHERE m.id = dragon_transform_model_outputs.model_id
    AND (m.company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "dragon_tmodel_out_delete" ON public.dragon_transform_model_outputs FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dragon_transform_models m
    WHERE m.id = dragon_transform_model_outputs.model_id
    AND (m.company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));

-- ===================== TABLE 11: dragon_transform_batches =====================

CREATE TABLE public.dragon_transform_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  model_id uuid NOT NULL REFERENCES public.dragon_transform_models(id),
  execution_date date NOT NULL DEFAULT CURRENT_DATE,
  source_register_movement_id uuid REFERENCES public.dragon_register_movements(id),
  source_item_id uuid NOT NULL REFERENCES public.dragon_items(id),
  input_quantity numeric NOT NULL,
  notes text,
  status dragon_batch_status NOT NULL DEFAULT 'BOZZA',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dragon_tbatch_company ON public.dragon_transform_batches(company_id);
CREATE INDEX idx_dragon_tbatch_status ON public.dragon_transform_batches(status);

ALTER TABLE public.dragon_transform_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dragon_tbatch_select" ON public.dragon_transform_batches FOR SELECT TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_tbatch_insert" ON public.dragon_transform_batches FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_tbatch_update" ON public.dragon_transform_batches FOR UPDATE TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Add FK now that table exists
ALTER TABLE public.dragon_register_movements
  ADD CONSTRAINT fk_dragon_reg_mov_batch FOREIGN KEY (source_transform_batch_id) REFERENCES public.dragon_transform_batches(id);
ALTER TABLE public.dragon_stock_movements
  ADD CONSTRAINT fk_dragon_stock_mov_batch FOREIGN KEY (source_transform_batch_id) REFERENCES public.dragon_transform_batches(id);

-- ===================== TABLE 12: dragon_transform_batch_outputs =====================

CREATE TABLE public.dragon_transform_batch_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.dragon_transform_batches(id) ON DELETE CASCADE,
  output_item_id uuid NOT NULL REFERENCES public.dragon_items(id),
  output_quantity numeric NOT NULL,
  warehouse_scope dragon_warehouse_scope NOT NULL DEFAULT 'WASTE',
  generated_register_movement_id uuid REFERENCES public.dragon_register_movements(id),
  generated_stock_movement_id uuid REFERENCES public.dragon_stock_movements(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dragon_tbatch_out_batch ON public.dragon_transform_batch_outputs(batch_id);

ALTER TABLE public.dragon_transform_batch_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dragon_tbatch_out_select" ON public.dragon_transform_batch_outputs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dragon_transform_batches b
    WHERE b.id = dragon_transform_batch_outputs.batch_id
    AND (b.company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "dragon_tbatch_out_insert" ON public.dragon_transform_batch_outputs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.dragon_transform_batches b
    WHERE b.id = dragon_transform_batch_outputs.batch_id
    AND (b.company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  ));

-- ===================== TABLE 13: dragon_inventory_adjustments =====================

CREATE TABLE public.dragon_inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.dragon_items(id),
  adjustment_type dragon_adjustment_type NOT NULL,
  quantity numeric NOT NULL,
  reason text NOT NULL,
  related_stock_movement_id uuid REFERENCES public.dragon_stock_movements(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dragon_adj_company ON public.dragon_inventory_adjustments(company_id);

ALTER TABLE public.dragon_inventory_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dragon_adj_select" ON public.dragon_inventory_adjustments FOR SELECT TO authenticated
  USING (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_adj_insert" ON public.dragon_inventory_adjustments FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- ===================== TABLE 14: dragon_audit_logs =====================

CREATE TABLE public.dragon_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action_type dragon_audit_action NOT NULL,
  before_state jsonb,
  after_state jsonb,
  performed_by uuid,
  performed_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

CREATE INDEX idx_dragon_audit_entity ON public.dragon_audit_logs(entity_type, entity_id);
CREATE INDEX idx_dragon_audit_time ON public.dragon_audit_logs(performed_at);

ALTER TABLE public.dragon_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dragon_audit_select" ON public.dragon_audit_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dragon_audit_insert" ON public.dragon_audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- ===================== FUNCTIONS =====================

-- Next movement number
CREATE OR REPLACE FUNCTION public.dragon_next_movement_number(p_company_id uuid, p_register_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(movement_number), 0) + 1
  FROM public.dragon_register_movements
  WHERE company_id = p_company_id
    AND register_id = p_register_id
    AND deleted_at IS NULL;
$$;

-- Stock balance
CREATE OR REPLACE FUNCTION public.dragon_get_stock_balance(p_company_id uuid, p_item_id uuid, p_scope dragon_warehouse_scope DEFAULT NULL)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE WHEN sign = 'PLUS' THEN quantity ELSE -quantity END
  ), 0)
  FROM public.dragon_stock_movements
  WHERE company_id = p_company_id
    AND item_id = p_item_id
    AND (p_scope IS NULL OR warehouse_scope = p_scope);
$$;

-- ===================== TRIGGERS =====================

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION public.dragon_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_dragon_items_updated_at BEFORE UPDATE ON public.dragon_items
  FOR EACH ROW EXECUTE FUNCTION public.dragon_update_updated_at();

CREATE TRIGGER trg_dragon_causes_updated_at BEFORE UPDATE ON public.dragon_causes
  FOR EACH ROW EXECUTE FUNCTION public.dragon_update_updated_at();

CREATE TRIGGER trg_dragon_sites_updated_at BEFORE UPDATE ON public.dragon_production_sites
  FOR EACH ROW EXECUTE FUNCTION public.dragon_update_updated_at();

CREATE TRIGGER trg_dragon_registers_updated_at BEFORE UPDATE ON public.dragon_registers
  FOR EACH ROW EXECUTE FUNCTION public.dragon_update_updated_at();

CREATE TRIGGER trg_dragon_documents_updated_at BEFORE UPDATE ON public.dragon_documents
  FOR EACH ROW EXECUTE FUNCTION public.dragon_update_updated_at();

CREATE TRIGGER trg_dragon_reg_mov_updated_at BEFORE UPDATE ON public.dragon_register_movements
  FOR EACH ROW EXECUTE FUNCTION public.dragon_update_updated_at();

CREATE TRIGGER trg_dragon_tbatch_updated_at BEFORE UPDATE ON public.dragon_transform_batches
  FOR EACH ROW EXECUTE FUNCTION public.dragon_update_updated_at();

-- Auto-assign movement_number on insert
CREATE OR REPLACE FUNCTION public.dragon_auto_movement_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_number = 0 OR NEW.movement_number IS NULL THEN
    NEW.movement_number := public.dragon_next_movement_number(NEW.company_id, NEW.register_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_dragon_reg_mov_number BEFORE INSERT ON public.dragon_register_movements
  FOR EACH ROW EXECUTE FUNCTION public.dragon_auto_movement_number();

-- Auto-generate stock movement when register movement is consolidated
CREATE OR REPLACE FUNCTION public.dragon_auto_stock_from_register()
RETURNS TRIGGER AS $$
DECLARE
  v_cause record;
BEGIN
  -- Only fire when status changes TO CONSOLIDATO
  IF NEW.status = 'CONSOLIDATO' AND (OLD.status IS NULL OR OLD.status = 'BOZZA') THEN
    SELECT * INTO v_cause FROM public.dragon_causes WHERE id = NEW.cause_id;
    
    IF v_cause.generates_stock_movement AND v_cause.stock_sign != 'NONE' THEN
      INSERT INTO public.dragon_stock_movements (
        company_id, item_id, movement_date, cause_id, quantity, sign,
        warehouse_scope, source_register_movement_id, created_by
      ) VALUES (
        NEW.company_id,
        NEW.item_id,
        NEW.movement_date,
        NEW.cause_id,
        NEW.quantity,
        CASE WHEN v_cause.stock_sign = 'PLUS' THEN 'PLUS'::dragon_sign ELSE 'MINUS'::dragon_sign END,
        CASE WHEN (SELECT item_type FROM public.dragon_items WHERE id = NEW.item_id) IN ('MPS', 'MATERIAL') THEN 'MPS'::dragon_warehouse_scope ELSE 'WASTE'::dragon_warehouse_scope END,
        NEW.id,
        NEW.created_by
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_dragon_auto_stock AFTER UPDATE ON public.dragon_register_movements
  FOR EACH ROW EXECUTE FUNCTION public.dragon_auto_stock_from_register();

-- Also fire on INSERT if status is already CONSOLIDATO
CREATE OR REPLACE FUNCTION public.dragon_auto_stock_from_register_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_cause record;
BEGIN
  IF NEW.status = 'CONSOLIDATO' THEN
    SELECT * INTO v_cause FROM public.dragon_causes WHERE id = NEW.cause_id;
    
    IF v_cause.generates_stock_movement AND v_cause.stock_sign != 'NONE' THEN
      INSERT INTO public.dragon_stock_movements (
        company_id, item_id, movement_date, cause_id, quantity, sign,
        warehouse_scope, source_register_movement_id, created_by
      ) VALUES (
        NEW.company_id, NEW.item_id, NEW.movement_date, NEW.cause_id, NEW.quantity,
        CASE WHEN v_cause.stock_sign = 'PLUS' THEN 'PLUS'::dragon_sign ELSE 'MINUS'::dragon_sign END,
        CASE WHEN (SELECT item_type FROM public.dragon_items WHERE id = NEW.item_id) IN ('MPS', 'MATERIAL') THEN 'MPS'::dragon_warehouse_scope ELSE 'WASTE'::dragon_warehouse_scope END,
        NEW.id, NEW.created_by
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_dragon_auto_stock_insert AFTER INSERT ON public.dragon_register_movements
  FOR EACH ROW EXECUTE FUNCTION public.dragon_auto_stock_from_register_insert();

-- ===================== SEED: 13 CAUSES =====================

INSERT INTO public.dragon_causes (code, name, scope, direction, requires_fir, requires_site, requires_source_movement, generates_stock_movement, stock_sign, default_document_type, config) VALUES
('CARICO_PRODUZIONE_UL', 'Carico produzione presso U.L.', 'BOTH', 'IN', false, false, false, true, 'PLUS', NULL, '{"movement_type":"CARICO"}'),
('CARICO_PRODUZIONE_FUORI_UL', 'Carico produzione fuori U.L.', 'BOTH', 'IN', false, true, false, true, 'PLUS', NULL, '{"movement_type":"CARICO"}'),
('CARICO_DA_FORMULARIO', 'Carico da formulario in arrivo', 'BOTH', 'IN', true, false, false, true, 'PLUS', 'FIR', '{"movement_type":"CARICO"}'),
('SCARICO_USCITA_FORMULARIO', 'Scarico uscita con formulario', 'BOTH', 'OUT', true, false, false, true, 'MINUS', 'FIR', '{"movement_type":"SCARICO"}'),
('CARICO_SCARICO_CONTESTUALE', 'Carico e scarico contestuale', 'BOTH', 'OUT', true, true, false, false, 'NONE', 'FIR', '{"movement_type":"BOTH","wizard":"contestuale"}'),
('SCARICO_PER_LAVORAZIONE', 'Scarico per lavorazione/cernita', 'BOTH', 'TRANSFORM', false, false, false, true, 'MINUS', NULL, '{"movement_type":"SCARICO"}'),
('CARICO_DA_LAVORAZIONE', 'Carico da lavorazione/cernita', 'BOTH', 'TRANSFORM', false, false, false, true, 'PLUS', NULL, '{"movement_type":"CARICO"}'),
('RETTIFICA_GIACENZA_POSITIVA', 'Rettifica giacenza positiva', 'BOTH', 'ADJUST', false, false, false, true, 'PLUS', NULL, '{"movement_type":"CARICO"}'),
('RETTIFICA_GIACENZA_NEGATIVA', 'Rettifica giacenza negativa', 'BOTH', 'ADJUST', false, false, false, true, 'MINUS', NULL, '{"movement_type":"SCARICO"}'),
('CARICO_MANUALE_MPS', 'Carico manuale MPS', 'STOCK', 'IN', false, false, false, true, 'PLUS', NULL, '{"movement_type":"CARICO","warehouse_scope":"MPS"}'),
('SCARICO_MANUALE_MPS', 'Scarico manuale MPS', 'STOCK', 'OUT', false, false, false, true, 'MINUS', NULL, '{"movement_type":"SCARICO","warehouse_scope":"MPS"}'),
('CARICO_DA_DDT', 'Carico da DDT', 'BOTH', 'IN', false, false, false, true, 'PLUS', 'DDT_IN', '{"movement_type":"CARICO"}'),
('SCARICO_DA_DDT', 'Scarico da DDT', 'BOTH', 'OUT', false, false, false, true, 'MINUS', 'DDT_OUT', '{"movement_type":"SCARICO"}');
