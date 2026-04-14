import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ArrowDown, ArrowUp, FileText, Scissors, Package } from "lucide-react";
import type { DragonStockMovement } from "@/types/dragon";

interface Props {
  movement: DragonStockMovement | null;
  open: boolean;
  onClose: () => void;
}

interface TraceChain {
  firDocument: any | null;
  registerMovement: any | null;
  transformBatch: any | null;
  batchOutputs: any[];
  parentMovement: any | null;
  childMovements: any[];
  allocations: any[];
}

export function DragonMovementDetail({ movement, open, onClose }: Props) {
  const [chain, setChain] = useState<TraceChain | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!movement || !open) { setChain(null); return; }
    loadTraceChain(movement);
  }, [movement?.id, open]);

  const loadTraceChain = async (m: DragonStockMovement) => {
    setLoading(true);
    try {
      const result: TraceChain = {
        firDocument: null,
        registerMovement: null,
        transformBatch: null,
        batchOutputs: [],
        parentMovement: null,
        childMovements: [],
        allocations: [],
      };

      // 1. Load linked register movement
      if (m.source_register_movement_id) {
        const { data } = await supabase
          .from("dragon_register_movements")
          .select("*, cause:dragon_causes(*), item:dragon_items(*), linked_document:dragon_documents(*), register:dragon_registers(*)")
          .eq("id", m.source_register_movement_id)
          .single();
        if (data) {
          result.registerMovement = data;
          // Get FIR document from register movement
          if (data.linked_document_id) {
            result.firDocument = data.linked_document;
          }
          // Get parent movement (e.g. carico that led to this scarico)
          if (data.parent_movement_id) {
            const { data: parent } = await supabase
              .from("dragon_register_movements")
              .select("*, cause:dragon_causes(*), item:dragon_items(*)")
              .eq("id", data.parent_movement_id)
              .single();
            result.parentMovement = parent;
          }
          // Get child movements
          const { data: children } = await supabase
            .from("dragon_register_movements")
            .select("*, cause:dragon_causes(*), item:dragon_items(*)")
            .eq("parent_movement_id", m.source_register_movement_id)
            .is("deleted_at", null);
          result.childMovements = children || [];

          // Get FIFO allocations
          const { data: allocsOut } = await supabase
            .from("dragon_movement_allocations")
            .select("*, in_mov:dragon_register_movements!dragon_movement_allocations_in_movement_id_fkey(movement_number, movement_date, quantity, cer_code)")
            .eq("out_movement_id", m.source_register_movement_id);
          const { data: allocsIn } = await supabase
            .from("dragon_movement_allocations")
            .select("*, out_mov:dragon_register_movements!dragon_movement_allocations_out_movement_id_fkey(movement_number, movement_date, quantity, cer_code)")
            .eq("in_movement_id", m.source_register_movement_id);
          result.allocations = [...(allocsOut || []), ...(allocsIn || [])];
        }
      }

      // 2. Load transform batch
      if (m.source_transform_batch_id) {
        const { data: batch } = await supabase
          .from("dragon_transform_batches")
          .select("*, source_item:dragon_items!dragon_transform_batches_source_item_id_fkey(*), model:dragon_transform_models(*)")
          .eq("id", m.source_transform_batch_id)
          .single();
        if (batch) {
          result.transformBatch = batch;
          const { data: outputs } = await supabase
            .from("dragon_transform_batch_outputs")
            .select("*, output_item:dragon_items!dragon_transform_batch_outputs_output_item_id_fkey(*)")
            .eq("batch_id", m.source_transform_batch_id);
          result.batchOutputs = outputs || [];
        }
      }

      // 3. If no register movement link, try to find via document
      if (!result.firDocument && m.source_document_id) {
        const { data: doc } = await supabase
          .from("dragon_documents")
          .select("*")
          .eq("id", m.source_document_id)
          .single();
        result.firDocument = doc;
      }

      setChain(result);
    } catch (e) {
      console.error("Trace chain error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!movement) return null;
  const m = movement;
  const item = m.item as any;
  const cause = m.cause as any;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dettaglio Movimento & Tracciabilità</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-2">
            <Row label="Data" value={new Date(m.movement_date).toLocaleDateString("it-IT")} />
            <Row label="Articolo" value={`${item?.codice_cer} — ${item?.descrizione}`} />
            <Row label="Causale" value={cause?.name || cause?.code || "—"} />
            <Row label="Segno" value={m.sign === "PLUS" ? "+CARICO" : "−SCARICO"} />
            <Row label="Quantità" value={`${Number(m.quantity).toLocaleString("it-IT")} ${item?.unita_misura_default || "kg"}`} />
            <Row label="Ambito" value={m.warehouse_scope} />
            {m.lot_reference && <Row label="Lotto" value={m.lot_reference} />}
            {m.note && <Row label="Note" value={m.note} />}
          </div>

          {/* Traceability chain */}
          <div className="border-t border-border/30 pt-3">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              🔍 Tracciabilità (Rintraccia)
            </p>

            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Caricamento catena...
              </div>
            ) : chain ? (
              <div className="space-y-3">
                {/* FIR Document */}
                {chain.firDocument && (
                  <TraceBlock
                    icon={<FileText className="h-4 w-4" />}
                    title="Documento FIR"
                    color="blue"
                    items={[
                      `Tipo: ${chain.firDocument.document_type}`,
                      chain.firDocument.number ? `N°: ${chain.firDocument.number}` : null,
                      chain.firDocument.document_date ? `Data: ${new Date(chain.firDocument.document_date).toLocaleDateString("it-IT")}` : null,
                      `Stato: ${chain.firDocument.status}`,
                    ]}
                  />
                )}

                {/* Register Movement */}
                {chain.registerMovement && (
                  <TraceBlock
                    icon={chain.registerMovement.movement_type === "CARICO" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                    title={`Registro: ${chain.registerMovement.movement_type} #${chain.registerMovement.movement_number}`}
                    color={chain.registerMovement.movement_type === "CARICO" ? "emerald" : "rose"}
                    items={[
                      `CER: ${chain.registerMovement.cer_code}`,
                      `Quantità: ${Number(chain.registerMovement.quantity).toLocaleString("it-IT")} ${chain.registerMovement.unit_of_measure}`,
                      `Causale: ${chain.registerMovement.cause?.name || "—"}`,
                      `Stato: ${chain.registerMovement.status}`,
                      chain.registerMovement.register ? `Registro: ${chain.registerMovement.register.register_code}` : null,
                    ]}
                  />
                )}

                {/* Parent movement */}
                {chain.parentMovement && (
                  <TraceBlock
                    icon={<ArrowDown className="h-4 w-4" />}
                    title={`Movimento Origine: ${chain.parentMovement.movement_type} #${chain.parentMovement.movement_number}`}
                    color="amber"
                    items={[
                      `CER: ${chain.parentMovement.cer_code}`,
                      `${Number(chain.parentMovement.quantity).toLocaleString("it-IT")} kg`,
                      `Causale: ${chain.parentMovement.cause?.name || "—"}`,
                    ]}
                  />
                )}

                {/* Transform batch */}
                {chain.transformBatch && (
                  <TraceBlock
                    icon={<Scissors className="h-4 w-4" />}
                    title={`Cernita/Lavorazione — ${chain.transformBatch.status}`}
                    color="violet"
                    items={[
                      `Input: ${chain.transformBatch.source_item?.codice_cer} — ${Number(chain.transformBatch.input_quantity).toLocaleString("it-IT")} kg`,
                      chain.transformBatch.model ? `Modello: ${chain.transformBatch.model.name}` : "Manuale (senza modello)",
                      `Data: ${new Date(chain.transformBatch.execution_date).toLocaleDateString("it-IT")}`,
                      ...chain.batchOutputs.map((o: any) =>
                        `→ ${o.output_item?.codice_cer} (${o.warehouse_scope}): ${Number(o.output_quantity).toLocaleString("it-IT")} kg`
                      ),
                    ]}
                  />
                )}

                {/* Child movements */}
                {chain.childMovements.length > 0 && (
                  <TraceBlock
                    icon={<ArrowUp className="h-4 w-4" />}
                    title={`Movimenti Collegati (${chain.childMovements.length})`}
                    color="cyan"
                    items={chain.childMovements.map((c: any) =>
                      `${c.movement_type} #${c.movement_number}: ${c.cer_code} — ${Number(c.quantity).toLocaleString("it-IT")} kg (${c.cause?.name || "—"})`
                    )}
                  />
                )}

                {/* FIFO allocations */}
                {chain.allocations.length > 0 && (
                  <TraceBlock
                    icon={<Package className="h-4 w-4" />}
                    title={`Abbinamenti FIFO (${chain.allocations.length})`}
                    color="orange"
                    items={chain.allocations.map((a: any) => {
                      const linked = a.in_mov || a.out_mov;
                      return linked
                        ? `Mov. #${linked.movement_number} (${new Date(linked.movement_date).toLocaleDateString("it-IT")}): ${Number(a.allocated_quantity).toLocaleString("it-IT")} kg`
                        : `${Number(a.allocated_quantity).toLocaleString("it-IT")} kg`;
                    })}
                  />
                )}

                {/* No chain data */}
                {!chain.firDocument && !chain.registerMovement && !chain.transformBatch && chain.allocations.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nessun collegamento trovato per questo movimento
                  </p>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                <TraceRow label="Mov. Registro" id={m.source_register_movement_id} />
                <TraceRow label="Batch Trasformazione" id={m.source_transform_batch_id} />
                <TraceRow label="Documento" id={m.source_document_id} />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TraceBlock({ icon, title, color, items }: {
  icon: React.ReactNode;
  title: string;
  color: string;
  items: (string | null)[];
}) {
  const filtered = items.filter(Boolean) as string[];
  return (
    <div className={`p-3 rounded-lg border border-${color}-500/20 bg-${color}-500/5`}>
      <div className={`flex items-center gap-2 text-xs font-semibold text-${color}-400 mb-1`}>
        {icon} {title}
      </div>
      <ul className="space-y-0.5">
        {filtered.map((item, i) => (
          <li key={i} className="text-xs text-muted-foreground">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function TraceRow({ label, id }: { label: string; id: string | null | undefined }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      {id ? (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">
          {id.slice(0, 8)}…
        </Badge>
      ) : (
        <span className="text-muted-foreground/50">—</span>
      )}
    </div>
  );
}
