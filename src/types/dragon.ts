// Dragon Rifiuti 2 — TypeScript types

export type DragonItemType = 'WASTE_CER' | 'MPS' | 'MATERIAL';
export type DragonCauseScope = 'REGISTER' | 'STOCK' | 'BOTH';
export type DragonCauseDirection = 'IN' | 'OUT' | 'TRANSFORM' | 'ADJUST';
export type DragonStockSign = 'PLUS' | 'MINUS' | 'NONE';
export type DragonMovementType = 'CARICO' | 'SCARICO';
export type DragonSign = 'PLUS' | 'MINUS';
export type DragonMovementStatus = 'BOZZA' | 'CONSOLIDATO' | 'STAMPATO' | 'DA_NON_STAMPARE' | 'DA_NON_INVIARE_RENTRI' | 'INVIATO_RENTRI';
export type DragonWeightStatus = 'DEFINITIVO' | 'DA_VERIFICARE_A_DESTINO';
export type DragonSourceContext = 'UL' | 'FUORI_UL';
export type DragonDocumentType = 'FIR' | 'DDT_IN' | 'DDT_OUT' | 'FORMULARIO_MODELLO' | 'ALTRO';
export type DragonSubjectType = 'PRODUTTORE' | 'DESTINATARIO' | 'TRASPORTATORE' | 'INTERMEDIARIO';
export type DragonSiteActivity = 'ND' | 'MANUTENZIONE' | 'ASSISTENZA_SANITARIA' | 'CANTIERE_TEMPORANEO_MOBILE' | 'BONIFICA_AMIANTO';
export type DragonBatchStatus = 'BOZZA' | 'CONFERMATA' | 'ANNULLATA';
export type DragonWarehouseScope = 'WASTE' | 'MPS';
export type DragonQuantityMode = 'PERCENT' | 'FIXED';
export type DragonAdjustmentType = 'POSITIVE' | 'NEGATIVE';
export type DragonAuditAction = 'CREATE' | 'UPDATE' | 'SOFT_DELETE' | 'RESTORE' | 'CONFIRM' | 'CANCEL' | 'ADJUST';

export interface DragonItem {
  id: string;
  company_id: string;
  codice_cer: string;
  descrizione: string;
  pericoloso: boolean;
  classi_hp: string[];
  stato_fisico_default: string | null;
  unita_misura_default: string;
  item_type: DragonItemType;
  attivo: boolean;
  metadata: Record<string, unknown>;
  fattore_conversione: number;
  tipo_mps_eow: string | null;
  tipo_mps_eow_desc: string | null;
  default_warehouse_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DragonCause {
  id: string;
  code: string;
  name: string;
  scope: DragonCauseScope;
  direction: DragonCauseDirection;
  requires_fir: boolean;
  requires_site: boolean;
  requires_source_movement: boolean;
  generates_stock_movement: boolean;
  stock_sign: DragonStockSign;
  default_document_type: DragonDocumentType | null;
  active: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DragonProductionSite {
  id: string;
  company_id: string;
  site_code: string;
  name: string;
  address: string | null;
  municipality: string | null;
  province: string | null;
  notes: string | null;
  activity_type: DragonSiteActivity;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DragonRegister {
  id: string;
  company_id: string;
  register_code: string;
  description: string | null;
  subject_type: DragonSubjectType;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DragonDocument {
  id: string;
  company_id: string;
  document_type: DragonDocumentType;
  number: string | null;
  document_date: string | null;
  counterparty_id: string | null;
  notes: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DragonRegisterMovement {
  id: string;
  company_id: string;
  register_id: string | null;
  movement_number: number;
  internal_number: string | null;
  movement_date: string;
  recording_date: string;
  item_id: string;
  cer_code: string;
  description_snapshot: string | null;
  movement_type: DragonMovementType;
  cause_id: string;
  quantity: number;
  unit_of_measure: string;
  sign: DragonSign;
  physical_state: string | null;
  hp_codes: string[];
  destination_type: string | null;
  note: string | null;
  annotations: string | null;
  source_site_id: string | null;
  source_context: DragonSourceContext;
  linked_document_id: string | null;
  weight_status: DragonWeightStatus;
  status: DragonMovementStatus;
  parent_movement_id: string | null;
  source_transform_batch_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  item?: DragonItem;
  cause?: DragonCause;
  source_site?: DragonProductionSite;
  linked_document?: DragonDocument;
  register?: DragonRegister;
}

export interface DragonStockMovement {
  id: string;
  company_id: string;
  item_id: string;
  movement_date: string;
  cause_id: string;
  quantity: number;
  sign: DragonSign;
  warehouse_scope: DragonWarehouseScope;
  warehouse_id: string | null;
  source_register_movement_id: string | null;
  source_transform_batch_id: string | null;
  source_document_id: string | null;
  lot_reference: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  // Joined
  item?: DragonItem;
  cause?: DragonCause;
}

export interface DragonMovementAllocation {
  id: string;
  out_movement_id: string;
  in_movement_id: string;
  allocated_quantity: number;
  created_at: string;
}

export interface DragonTransformModel {
  id: string;
  company_id: string;
  code: string;
  name: string;
  input_item_id: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  input_item?: DragonItem;
  outputs?: DragonTransformModelOutput[];
}

export interface DragonTransformModelOutput {
  id: string;
  model_id: string;
  output_item_id: string;
  output_type: DragonItemType;
  quantity_mode: DragonQuantityMode;
  quantity_value: number;
  warehouse_scope: DragonWarehouseScope;
  notes: string | null;
  created_at: string;
  output_item?: DragonItem;
}

export interface DragonTransformBatch {
  id: string;
  company_id: string;
  model_id: string;
  execution_date: string;
  source_register_movement_id: string | null;
  source_item_id: string;
  input_quantity: number;
  notes: string | null;
  status: DragonBatchStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  model?: DragonTransformModel;
  source_item?: DragonItem;
  outputs?: DragonTransformBatchOutput[];
}

export interface DragonTransformBatchOutput {
  id: string;
  batch_id: string;
  output_item_id: string;
  output_quantity: number;
  warehouse_scope: DragonWarehouseScope;
  generated_register_movement_id: string | null;
  generated_stock_movement_id: string | null;
  created_at: string;
  output_item?: DragonItem;
}

export interface DragonInventoryAdjustment {
  id: string;
  company_id: string;
  item_id: string;
  adjustment_type: DragonAdjustmentType;
  quantity: number;
  reason: string;
  related_stock_movement_id: string | null;
  created_by: string | null;
  created_at: string;
  item?: DragonItem;
}

export interface DragonAuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action_type: DragonAuditAction;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  performed_by: string | null;
  performed_at: string;
  reason: string | null;
}

export interface DragonStockBalance {
  item_id: string;
  item: DragonItem;
  warehouse_scope: DragonWarehouseScope;
  balance: number;
}
