import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useDragonDocuments } from "@/hooks/dragon/useDragonDocuments";
import { useDragonCauses } from "@/hooks/dragon/useDragonCauses";
import type { DragonRegisterMovement } from "@/types/dragon";
import { Info, ArrowDownCircle } from "lucide-react";
import { TUTTI_CODICI_OPERAZIONE } from "@/lib/codiciRecuperoSmaltimento";

interface Props {
  pendingCarichi: DragonRegisterMovement[];
  onSubmit: (data: {
    scarico: Record<string, any>;
    allocations: { in_movement_id: string; allocated_quantity: number }[];
  }) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}

export function DragonScaricoCumulativo({ pendingCarichi, onSubmit, isLoading, onCancel }: Props) {
  const { documents } = useDragonDocuments();
  const { causes } = useDragonCauses();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [totalQuantity, setTotalQuantity] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [note, setNote] = useState("");
  const [operationCode, setOperationCode] = useState("");

  const causeScarico = causes.find(c => c.code === "SCARICO_USCITA_FORMULARIO");

  // Group carichi by CER
  const cerGroups = useMemo(() => {
    const map = new Map<string, DragonRegisterMovement[]>();
    for (const c of pendingCarichi) {
      const key = c.cer_code;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [pendingCarichi]);

  const [filterCer, setFilterCer] = useState("");
  const cerCodes = Array.from(cerGroups.keys()).sort();

  const filteredCarichi = useMemo(() => {
    let list = pendingCarichi.filter(c => c.movement_type === "CARICO" && c.status === "CONSOLIDATO");
    if (filterCer) list = list.filter(c => c.cer_code === filterCer);
    return list.sort((a, b) => new Date(a.movement_date).getTime() - new Date(b.movement_date).getTime());
  }, [pendingCarichi, filterCer]);

  const selectedTotal = useMemo(() => {
    return filteredCarichi.filter(c => selectedIds.has(c.id)).reduce((sum, c) => sum + Number(c.quantity), 0);
  }, [filteredCarichi, selectedIds]);

  const toggleId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredCarichi.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCarichi.map(c => c.id)));
    }
  };

  // FIFO allocation
  const computeAllocations = () => {
    const qty = parseFloat(totalQuantity);
    if (!qty || qty <= 0) return [];
    const sorted = filteredCarichi
      .filter(c => selectedIds.has(c.id))
      .sort((a, b) => new Date(a.movement_date).getTime() - new Date(b.movement_date).getTime());

    const allocations: { in_movement_id: string; allocated_quantity: number }[] = [];
    let remaining = qty;
    for (const c of sorted) {
      if (remaining <= 0) break;
      const alloc = Math.min(remaining, Number(c.quantity));
      allocations.push({ in_movement_id: c.id, allocated_quantity: alloc });
      remaining -= alloc;
    }
    return allocations;
  };

  const allocations = computeAllocations();
  const firstSelected = filteredCarichi.find(c => selectedIds.has(c.id));
  const qty = parseFloat(totalQuantity || "0");

  const handleSubmit = async () => {
    if (!causeScarico || !firstSelected || allocations.length === 0) return;
    await onSubmit({
      scarico: {
        cause_id: causeScarico.id,
        item_id: firstSelected.item_id,
        cer_code: firstSelected.cer_code,
        description_snapshot: firstSelected.description_snapshot,
        quantity: qty,
        unit_of_measure: firstSelected.unit_of_measure,
        movement_date: new Date().toISOString().split("T")[0],
        recording_date: new Date().toISOString().split("T")[0],
        movement_type: "SCARICO",
        sign: "MINUS",
        source_context: "UL",
        linked_document_id: documentId || null,
        physical_state: firstSelected.physical_state,
        hp_codes: firstSelected.hp_codes || [],
        note: note || null,
        operation_code: operationCode || null,
        weight_status: "DEFINITIVO",
        status: "BOZZA",
      },
      allocations,
    });
  };

  return (
    <div className="space-y-5 mt-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 border border-border/20 rounded-lg p-3">
        <Info className="h-4 w-4 shrink-0" />
        <p>Seleziona i carichi pendenti da scaricare. Il sistema alloca le quantità in ordine FIFO (dal più vecchio).</p>
      </div>

      {/* Filter by CER */}
      <div>
        <Label>Filtra per CER</Label>
        <Select value={filterCer} onValueChange={setFilterCer}>
          <SelectTrigger><SelectValue placeholder="Tutti i CER" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tutti</SelectItem>
            {cerCodes.map(cer => (
              <SelectItem key={cer} value={cer}>{cer}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Carichi table */}
      <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/20">
              <TableHead className="w-10">
                <Checkbox checked={selectedIds.size === filteredCarichi.length && filteredCarichi.length > 0} onCheckedChange={selectAll} />
              </TableHead>
              <TableHead className="w-16">N°</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>CER</TableHead>
              <TableHead>Cantiere</TableHead>
              <TableHead className="text-right">Quantità</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCarichi.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nessun carico consolidato disponibile</TableCell></TableRow>
            ) : (
              filteredCarichi.map(c => (
                <TableRow key={c.id} className={`border-border/10 cursor-pointer ${selectedIds.has(c.id) ? "bg-primary/5" : ""}`} onClick={() => toggleId(c.id)}>
                  <TableCell><Checkbox checked={selectedIds.has(c.id)} /></TableCell>
                  <TableCell className="font-mono text-xs">{c.movement_number}</TableCell>
                  <TableCell className="text-sm">{new Date(c.movement_date).toLocaleDateString("it-IT")}</TableCell>
                  <TableCell className="font-mono text-sm">{c.cer_code}</TableCell>
                  <TableCell className="text-xs">{(c.source_site as any)?.name || "U.L."}</TableCell>
                  <TableCell className="text-right font-mono">{Number(c.quantity).toLocaleString("it-IT")} {c.unit_of_measure}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedIds.size > 0 && (
        <>
          <div className="bg-muted/20 border border-border/20 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{selectedIds.size} carichi selezionati</span>
            <span className="font-mono font-bold">{selectedTotal.toLocaleString("it-IT")} kg disponibili</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantità da scaricare *</Label>
              <Input type="number" step="0.01" min="0" max={selectedTotal} value={totalQuantity} onChange={e => setTotalQuantity(e.target.value)} placeholder="0.00" />
              {qty > selectedTotal && (
                <p className="text-xs text-destructive mt-1">Quantità superiore alla disponibilità ({selectedTotal.toLocaleString("it-IT")} kg)</p>
              )}
            </div>
            <div>
              <Label>FIR / Documento</Label>
              <Select value={documentId} onValueChange={setDocumentId}>
                <SelectTrigger><SelectValue placeholder="Opzionale..." /></SelectTrigger>
                <SelectContent>
                  {documents.filter(d => d.document_type === "FIR").map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.number || d.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Codice Operazione (R/D)</Label>
            <Select value={operationCode} onValueChange={setOperationCode}>
              <SelectTrigger><SelectValue placeholder="Seleziona operazione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nessuno</SelectItem>
                {TUTTI_CODICI_OPERAZIONE.map(op => (
                  <SelectItem key={op.codice} value={op.codice}>{op.codice} — {op.descrizione}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Note</Label><Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} /></div>

          {/* FIFO Preview */}
          {allocations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Allocazione FIFO</p>
              {allocations.map((a, i) => {
                const src = filteredCarichi.find(c => c.id === a.in_movement_id);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs bg-muted/20 rounded-md px-3 py-1.5">
                    <ArrowDownCircle className="h-3.5 w-3.5 text-rose-400" />
                    <span className="font-mono">Mov #{src?.movement_number}</span>
                    <span className="text-muted-foreground">({new Date(src?.movement_date || "").toLocaleDateString("it-IT")})</span>
                    <span className="ml-auto font-mono font-bold">{a.allocated_quantity.toLocaleString("it-IT")} kg</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Annulla</Button>
        <Button className="ml-auto" disabled={isLoading || allocations.length === 0 || qty > selectedTotal || qty <= 0} onClick={handleSubmit}>
          {isLoading ? "Salvataggio..." : "Registra Scarico Cumulativo"}
        </Button>
      </div>
    </div>
  );
}
