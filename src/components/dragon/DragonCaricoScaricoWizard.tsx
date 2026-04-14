import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useDragonSites } from "@/hooks/dragon/useDragonSites";
import { useDragonDocuments } from "@/hooks/dragon/useDragonDocuments";
import { useDragonCauses } from "@/hooks/dragon/useDragonCauses";
import { Check, ChevronRight, MapPin, FileText, Package, ArrowRight } from "lucide-react";
import { TUTTI_CODICI_OPERAZIONE } from "@/lib/codiciRecuperoSmaltimento";

interface Props {
  onSubmit: (data: { carico: Record<string, any>; scarico: Record<string, any> }) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}

const STEPS = ["Articolo & Quantità", "Cantiere", "Documento FIR", "Riepilogo"];

export function DragonCaricoScaricoWizard({ onSubmit, isLoading, onCancel }: Props) {
  const { items } = useDragonItems();
  const { sites } = useDragonSites();
  const { documents } = useDragonDocuments();
  const { causes } = useDragonCauses();
  const [step, setStep] = useState(0);

  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split("T")[0]);
  const [siteId, setSiteId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [note, setNote] = useState("");
  const [operationCode, setOperationCode] = useState("");
  const [physicalState, setPhysicalState] = useState("solido_non_pulverulento");

  const selectedItem = items.find(i => i.id === itemId);
  const selectedSite = sites.find(s => s.id === siteId);
  const selectedDoc = documents.find(d => d.id === documentId);

  const causeCarico = causes.find(c => c.code === "CARICO_PRODUZIONE_FUORI_UL");
  const causeScarico = causes.find(c => c.code === "SCARICO_USCITA_FORMULARIO");

  const canNext = () => {
    if (step === 0) return !!itemId && !!quantity && parseFloat(quantity) > 0;
    if (step === 1) return !!siteId;
    if (step === 2) return !!documentId;
    return true;
  };

  const handleSubmit = async () => {
    if (!causeCarico || !causeScarico || !selectedItem) return;
    const base = {
      item_id: itemId,
      cer_code: selectedItem.codice_cer,
      description_snapshot: selectedItem.descrizione,
      quantity: parseFloat(quantity),
      unit_of_measure: selectedItem.unita_misura_default || "kg",
      movement_date: movementDate,
      recording_date: new Date().toISOString().split("T")[0],
      physical_state: physicalState || selectedItem.stato_fisico_default,
      hp_codes: selectedItem.classi_hp || [],
      note: note || null,
      operation_code: operationCode || null,
      weight_status: "DEFINITIVO",
      status: "BOZZA",
    };
    await onSubmit({
      carico: {
        ...base,
        cause_id: causeCarico.id,
        movement_type: "CARICO",
        sign: "PLUS",
        source_context: "FUORI_UL",
        source_site_id: siteId,
        linked_document_id: null,
      },
      scarico: {
        ...base,
        cause_id: causeScarico.id,
        movement_type: "SCARICO",
        sign: "MINUS",
        source_context: "FUORI_UL",
        source_site_id: siteId,
        linked_document_id: documentId,
      },
    });
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
              i < step ? "bg-emerald-500 text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:inline ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 0: Articolo & Quantità */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Seleziona articolo e quantità</h3>
          </div>
          <div>
            <Label>Articolo / CER *</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue placeholder="Seleziona articolo..." /></SelectTrigger>
              <SelectContent>
                {items.filter(i => i.attivo && i.item_type === "WASTE_CER").map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.codice_cer} — {i.descrizione} {i.pericoloso ? "⚠️" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantità (kg) *</Label>
              <Input type="number" step="0.01" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Data Movimento</Label>
              <Input type="date" value={movementDate} onChange={e => setMovementDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Stato Fisico</Label>
            <Select value={physicalState} onValueChange={setPhysicalState}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solido_pulverulento">Solido pulverulento</SelectItem>
                <SelectItem value="solido_non_pulverulento">Solido non pulverulento</SelectItem>
                <SelectItem value="fangoso_palabile">Fangoso palabile</SelectItem>
                <SelectItem value="liquido">Liquido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Step 1: Cantiere */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Luogo di produzione fuori U.L.</h3>
          </div>
          <div>
            <Label>Cantiere *</Label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger><SelectValue placeholder="Seleziona cantiere..." /></SelectTrigger>
              <SelectContent>
                {sites.filter(s => s.active).map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.site_code} — {s.name} ({s.municipality}, {s.province})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedSite && (
            <div className="bg-muted/30 border border-border/30 rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium">{selectedSite.name}</p>
              <p className="text-muted-foreground">{selectedSite.address}, {selectedSite.municipality} ({selectedSite.province})</p>
              <Badge variant="outline" className="text-xs">{selectedSite.activity_type}</Badge>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Documento FIR */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Documento FIR collegato</h3>
          </div>
          <div>
            <Label>FIR / Formulario *</Label>
            <Select value={documentId} onValueChange={setDocumentId}>
              <SelectTrigger><SelectValue placeholder="Seleziona documento..." /></SelectTrigger>
              <SelectContent>
                {documents.filter(d => d.document_type === "FIR").map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.document_type} — {d.number || "Senza numero"} ({d.document_date ? new Date(d.document_date).toLocaleDateString("it-IT") : ""})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div>
            <Label>Note</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Note opzionali..." />
          </div>
        </div>
      )}

      {/* Step 3: Riepilogo */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Riepilogo operazione</h3>
          <div className="bg-muted/20 border border-border/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">CARICO</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">SCARICO</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Articolo</p>
                <p className="font-mono">{selectedItem?.codice_cer} — {selectedItem?.descrizione}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quantità</p>
                <p className="font-mono font-bold">{parseFloat(quantity || "0").toLocaleString("it-IT")} kg</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cantiere</p>
                <p>{selectedSite?.site_code} — {selectedSite?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">FIR</p>
                <p>{selectedDoc?.number || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p>{new Date(movementDate).toLocaleDateString("it-IT")}</p>
              </div>
              {operationCode && (
                <div>
                  <p className="text-xs text-muted-foreground">Operazione R/D</p>
                  <p className="font-mono">{operationCode}</p>
                </div>
              )}
            </div>
            <div className="border-t border-border/20 pt-3 text-xs text-muted-foreground">
              <p>Verranno creati <strong>2 movimenti</strong> di registro (carico + scarico) collegati, con i relativi movimenti di magazzino.</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-2">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(s => s - 1)}>Indietro</Button>
        )}
        <Button variant="outline" onClick={onCancel} className="ml-auto">Annulla</Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}>Avanti</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Salvataggio..." : "Conferma e Registra"}
          </Button>
        )}
      </div>
    </div>
  );
}
