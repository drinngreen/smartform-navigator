import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useDragonSites } from "@/hooks/dragon/useDragonSites";
import { useDragonDocuments } from "@/hooks/dragon/useDragonDocuments";
import type { DragonCause, DragonMovementType, DragonSign, DragonSourceContext } from "@/types/dragon";

interface Props {
  causes: DragonCause[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isLoading: boolean;
}

export function DragonMovementForm({ causes, onSubmit, isLoading }: Props) {
  const { items } = useDragonItems();
  const { sites } = useDragonSites();
  const { documents } = useDragonDocuments();

  const [causeId, setCauseId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split("T")[0]);
  const [siteId, setSiteId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [note, setNote] = useState("");
  const [physicalState, setPhysicalState] = useState("");

  const selectedCause = causes.find(c => c.id === causeId);
  const selectedItem = items.find(i => i.id === itemId);

  const movementType: DragonMovementType = selectedCause?.config?.movement_type === "SCARICO" ? "SCARICO" : "CARICO";
  const sign: DragonSign = movementType === "CARICO" ? "PLUS" : "MINUS";
  const sourceContext: DragonSourceContext = selectedCause?.requires_site ? "FUORI_UL" : "UL";

  const handleSubmit = async () => {
    if (!causeId || !itemId || !quantity) return;
    await onSubmit({
      cause_id: causeId,
      item_id: itemId,
      cer_code: selectedItem?.codice_cer || "",
      description_snapshot: selectedItem?.descrizione || "",
      quantity: parseFloat(quantity),
      unit_of_measure: selectedItem?.unita_misura_default || "kg",
      movement_date: movementDate,
      recording_date: new Date().toISOString().split("T")[0],
      movement_type: movementType,
      sign,
      source_context: sourceContext,
      source_site_id: siteId || null,
      linked_document_id: documentId || null,
      physical_state: physicalState || selectedItem?.stato_fisico_default || null,
      hp_codes: selectedItem?.classi_hp || [],
      note: note || null,
      status: "BOZZA",
      weight_status: "DEFINITIVO",
    });
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Causale */}
      <div>
        <Label>Causale *</Label>
        <Select value={causeId} onValueChange={setCauseId}>
          <SelectTrigger><SelectValue placeholder="Seleziona causale..." /></SelectTrigger>
          <SelectContent>
            {causes.filter(c => c.scope !== "STOCK").map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCause && (
          <p className="text-xs text-muted-foreground mt-1">
            {selectedCause.direction} • {selectedCause.requires_fir ? "🔗 Richiede FIR" : ""} {selectedCause.requires_site ? "📍 Richiede cantiere" : ""}
          </p>
        )}
      </div>

      {/* Articolo */}
      <div>
        <Label>Articolo / CER *</Label>
        <Select value={itemId} onValueChange={setItemId}>
          <SelectTrigger><SelectValue placeholder="Seleziona articolo..." /></SelectTrigger>
          <SelectContent>
            {items.filter(i => i.attivo).map(i => (
              <SelectItem key={i.id} value={i.id}>
                {i.codice_cer} — {i.descrizione} {i.pericoloso ? "⚠" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label>Quantità *</Label><Input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0.00" /></div>
        <div><Label>Data Movimento</Label><Input type="date" value={movementDate} onChange={e => setMovementDate(e.target.value)} /></div>
      </div>

      {/* Cantiere — condizionale */}
      {selectedCause?.requires_site && (
        <div>
          <Label>Cantiere / Luogo Produzione *</Label>
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger><SelectValue placeholder="Seleziona cantiere..." /></SelectTrigger>
            <SelectContent>
              {sites.filter(s => s.active).map(s => (
                <SelectItem key={s.id} value={s.id}>{s.site_code} — {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Documento — condizionale */}
      {selectedCause?.requires_fir && (
        <div>
          <Label>Documento collegato *</Label>
          <Select value={documentId} onValueChange={setDocumentId}>
            <SelectTrigger><SelectValue placeholder="Seleziona documento..." /></SelectTrigger>
            <SelectContent>
              {documents.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.document_type} — {d.number || "Senza numero"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Stato fisico */}
      <div>
        <Label>Stato Fisico</Label>
        <Select value={physicalState} onValueChange={setPhysicalState}>
          <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solido_pulverulento">Solido pulverulento</SelectItem>
            <SelectItem value="solido_non_pulverulento">Solido non pulverulento</SelectItem>
            <SelectItem value="fangoso_palabile">Fangoso palabile</SelectItem>
            <SelectItem value="liquido">Liquido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div><Label>Note</Label><Textarea value={note} onChange={e => setNote(e.target.value)} rows={3} /></div>

      {/* Preview */}
      {causeId && itemId && quantity && (
        <div className="bg-muted/30 border border-border/30 rounded-lg p-3 space-y-1">
          <p className="text-xs font-medium text-foreground">Riepilogo</p>
          <p className="text-xs text-muted-foreground">
            {movementType} {sign === "PLUS" ? "➕" : "➖"} {quantity} {selectedItem?.unita_misura_default || "kg"} di {selectedItem?.codice_cer}
          </p>
          <p className="text-xs text-muted-foreground">Causale: {selectedCause?.name}</p>
          {sourceContext === "FUORI_UL" && <p className="text-xs text-muted-foreground">📍 Fuori U.L.</p>}
        </div>
      )}

      <Button onClick={handleSubmit} disabled={isLoading || !causeId || !itemId || !quantity} className="w-full">
        {isLoading ? "Salvataggio..." : "Registra Movimento"}
      </Button>
    </div>
  );
}
