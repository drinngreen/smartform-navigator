import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { DragonStockMovement } from "@/types/dragon";

interface Props {
  movement: DragonStockMovement | null;
  open: boolean;
  onClose: () => void;
}

export function DragonMovementDetail({ movement, open, onClose }: Props) {
  if (!movement) return null;
  const m = movement;
  const item = m.item as any;
  const cause = m.cause as any;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dettaglio Movimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Row label="Data" value={new Date(m.movement_date).toLocaleDateString("it-IT")} />
          <Row label="Articolo" value={`${item?.codice_cer} — ${item?.descrizione}`} />
          <Row label="Causale" value={cause?.name || cause?.code || "—"} />
          <Row label="Segno" value={m.sign === "PLUS" ? "+CARICO" : "−SCARICO"} />
          <Row label="Quantità" value={`${Number(m.quantity).toLocaleString("it-IT")} ${item?.unita_misura_default || "kg"}`} />
          <Row label="Ambito" value={m.warehouse_scope} />
          {m.lot_reference && <Row label="Lotto" value={m.lot_reference} />}
          {m.note && <Row label="Note" value={m.note} />}

          <div className="border-t border-border/30 pt-3 mt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Tracciabilità</p>
            <TraceRow label="Mov. Registro collegato" id={m.source_register_movement_id} />
            <TraceRow label="Batch Trasformazione" id={m.source_transform_batch_id} />
            <TraceRow label="Documento collegato" id={m.source_document_id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
