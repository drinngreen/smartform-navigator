import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useDragonCauses } from "@/hooks/dragon/useDragonCauses";
import { useDragonWarehouses } from "@/hooks/dragon/useDragonWarehouses";
import { useMNContextStore } from "@/stores/mnContextStore";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DragonWarehouseScope } from "@/types/dragon";

interface Line {
  item_id: string;
  quantity: string;
  note: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function DragonNewMovementForm({ open, onOpenChange }: Props) {
  const { items } = useDragonItems();
  const { causes } = useDragonCauses();
  const { warehouses } = useDragonWarehouses();
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);
  const { user } = useAuth();
  const qc = useQueryClient();

  const stockCauses = causes.filter(c => c.scope === "STOCK" || c.scope === "BOTH");

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [causeId, setCauseId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ item_id: "", quantity: "", note: "" }]);
  const [submitting, setSubmitting] = useState(false);

  const addLine = () => setLines(l => [...l, { item_id: "", quantity: "", note: "" }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof Line, value: string) =>
    setLines(l => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line));

  const handleSubmit = async () => {
    if (!causeId || lines.every(l => !l.item_id || !l.quantity)) {
      toast.error("Compila causale e almeno una riga");
      return;
    }
    setSubmitting(true);
    try {
      const cause = causes.find(c => c.id === causeId);
      if (!cause) throw new Error("Causale non trovata");

      const sign = cause.stock_sign === "MINUS" ? "MINUS" : "PLUS";
      const validLines = lines.filter(l => l.item_id && l.quantity && parseFloat(l.quantity) > 0);

      const inserts = validLines.map(l => {
        const item = items.find(it => it.id === l.item_id);
        const ws: DragonWarehouseScope = item?.item_type === "WASTE_CER" ? "WASTE" : "MPS";
        return {
          company_id: companyId,
          item_id: l.item_id,
          movement_date: date,
          cause_id: causeId,
          quantity: parseFloat(l.quantity),
          sign,
          warehouse_scope: ws,
          warehouse_id: warehouseId || null,
          created_by: user?.id,
          note: l.note || null,
        };
      });

      const { error } = await supabase.from("dragon_stock_movements").insert(inserts as any);
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["dragon-stock"] });
      toast.success(`${validLines.length} moviment${validLines.length > 1 ? "i" : "o"} registrat${validLines.length > 1 ? "i" : "o"}`);
      onOpenChange(false);
      setLines([{ item_id: "", quantity: "", note: "" }]);
      setCauseId("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>Nuovo Movimento Magazzino</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Data Registrazione *</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Causale *</Label>
            <Select value={causeId} onValueChange={setCauseId}>
              <SelectTrigger><SelectValue placeholder="Seleziona causale..." /></SelectTrigger>
              <SelectContent>
                {stockCauses.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {warehouses.length > 0 && (
            <div>
              <Label>Magazzino</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Tutti i magazzini" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nessuno specifico</SelectItem>
                  {warehouses.filter(w => w.active).map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.code} — {w.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="border-t border-border/30 pt-3">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm font-semibold">Righe Movimento</Label>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Riga</Button>
            </div>
            <div className="space-y-3">
              {lines.map((line, i) => (
                <div key={i} className="border border-border/20 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-semibold">Riga {i + 1}</span>
                    {lines.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeLine(i)}><Trash2 className="h-3 w-3 text-rose-400" /></Button>
                    )}
                  </div>
                  <Select value={line.item_id} onValueChange={v => updateLine(i, "item_id", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Articolo..." /></SelectTrigger>
                    <SelectContent>
                      {items.filter(it => it.attivo).map(it => (
                        <SelectItem key={it.id} value={it.id}>{it.codice_cer} — {it.descrizione}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input type="number" step="0.01" className="h-8 text-xs" placeholder="Quantità" value={line.quantity} onChange={e => updateLine(i, "quantity", e.target.value)} />
                    <Input className="h-8 text-xs" placeholder="Note (opz.)" value={line.note} onChange={e => updateLine(i, "note", e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting || !causeId} className="w-full">
            {submitting ? "Registrazione..." : "Registra Movimento"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
