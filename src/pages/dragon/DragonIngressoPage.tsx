import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useDragonCauses } from "@/hooks/dragon/useDragonCauses";
import { useDragonRegisters } from "@/hooks/dragon/useDragonRegisters";
import { useDragonDocuments } from "@/hooks/dragon/useDragonDocuments";
import { useMNContextStore } from "@/stores/mnContextStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Check, ChevronRight, LogIn, FileText, Package, Scale } from "lucide-react";
import { toast } from "sonner";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";
import { TUTTI_CODICI_OPERAZIONE } from "@/lib/codiciRecuperoSmaltimento";

const STEPS = ["Dati FIR", "Articolo & Quantità", "Peso a Destino", "Riepilogo"];

const CAUSALI_INGRESSO = [
  { code: "INGRESSO_UL", label: "Ingresso da Unità Locale (produttore diretto)" },
  { code: "INGRESSO_MIO_CANTIERE", label: "Ingresso da mio cantiere (fuori UL propria)" },
  { code: "INGRESSO_CANTIERE_TERZI", label: "Ingresso da cantiere di terzi" },
];

export default function DragonIngressoPage() {
  const { context } = useParams<{ context: string }>();
  const navigate = useNavigate();
  const { items } = useDragonItems();
  const { causes } = useDragonCauses();
  const { registers } = useDragonRegisters();
  const { documents } = useDragonDocuments();
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);
  const { user } = useAuth();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 0: Dati FIR
  const [firNumber, setFirNumber] = useState("");
  const [produttore, setProduttore] = useState("");
  const [trasportatore, setTrasportatore] = useState("");
  const [dataRicezione, setDataRicezione] = useState(new Date().toISOString().split("T")[0]);
  const [causaleCode, setCausaleCode] = useState("INGRESSO_UL");

  // Step 1: Articolo
  const [itemId, setItemId] = useState("");
  const [quantitaOrigine, setQuantitaOrigine] = useState("");
  const [operationCode, setOperationCode] = useState("");
  const [physicalState, setPhysicalState] = useState("solido_non_pulverulento");
  const [note, setNote] = useState("");

  // Step 2: Peso a destino
  const [hasPesoDestino, setHasPesoDestino] = useState(true);
  const [quantitaDestino, setQuantitaDestino] = useState("");

  const selectedItem = items.find(i => i.id === itemId);
  const destinatarioRegister = registers.find(r => r.subject_type === "DESTINATARIO");
  const selectedCause = causes.find(c => c.code === causaleCode);

  const canNext = () => {
    if (step === 0) return !!firNumber && !!produttore && !!dataRicezione;
    if (step === 1) return !!itemId && !!quantitaOrigine && parseFloat(quantitaOrigine) > 0;
    if (step === 2) return !hasPesoDestino || (!!quantitaDestino && parseFloat(quantitaDestino) > 0);
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedItem || !selectedCause || !destinatarioRegister) {
      toast.error("Configurazione mancante: registro destinatario o causale non trovati");
      return;
    }
    setSubmitting(true);
    try {
      const qtyFinal = hasPesoDestino ? parseFloat(quantitaDestino) : parseFloat(quantitaOrigine);
      const weightStatus = hasPesoDestino ? "DEFINITIVO" : "DA_VERIFICARE_A_DESTINO";
      const movStatus = hasPesoDestino ? "BOZZA" : "BOZZA";

      // Create FIR document record
      const { data: doc, error: docErr } = await supabase
        .from("dragon_documents")
        .insert({
          company_id: companyId,
          document_type: "FIR",
          number: firNumber,
          document_date: dataRicezione,
          notes: `Produttore: ${produttore} | Trasportatore: ${trasportatore}`,
          status: hasPesoDestino ? "COMPLETO" : "IN_ATTESA_PESO",
          metadata: {
            produttore,
            trasportatore,
            quantita_origine: parseFloat(quantitaOrigine),
            quantita_destino: hasPesoDestino ? parseFloat(quantitaDestino) : null,
          },
        } as any)
        .select()
        .single();
      if (docErr) throw docErr;

      // Create CARICO movement on the Destinatario register
      const { error: movErr } = await supabase
        .from("dragon_register_movements")
        .insert({
          company_id: companyId,
          register_id: destinatarioRegister.id,
          movement_date: dataRicezione,
          recording_date: new Date().toISOString().split("T")[0],
          item_id: itemId,
          cer_code: selectedItem.codice_cer,
          description_snapshot: selectedItem.descrizione,
          movement_type: "CARICO",
          cause_id: selectedCause.id,
          quantity: qtyFinal,
          unit_of_measure: selectedItem.unita_misura_default || "kg",
          sign: "PLUS",
          source_context: "UL",
          physical_state: physicalState || selectedItem.stato_fisico_default,
          hp_codes: selectedItem.classi_hp || [],
          weight_status: weightStatus,
          status: movStatus,
          linked_document_id: doc.id,
          operation_code: operationCode || null,
          note: note || null,
          created_by: user?.id,
        } as any);
      if (movErr) throw movErr;

      qc.invalidateQueries({ queryKey: ["dragon-register"] });
      qc.invalidateQueries({ queryKey: ["dragon-stock"] });
      qc.invalidateQueries({ queryKey: ["dragon-documents"] });

      if (!hasPesoDestino) {
        toast.success("FIR registrato — In attesa del peso a destino (evidenziato in giallo)");
      } else {
        toast.success("FIR registrato con peso a destino — Movimento di carico creato");
      }
      navigate(`/mn/admin/${context}/dragon/registro`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MNAdminLayout title="Ingresso FIR Destinatario" subtitle="Dragon — Accettazione rifiuti in ingresso">
      <div className="max-w-2xl mx-auto space-y-4">
        <DragonBackButton />
        <div className="bg-card/60 border border-border/30 rounded-xl p-6 space-y-6">
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

          {/* Step 0: Dati FIR */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Dati del Formulario in ingresso</h3>
              </div>
              <div>
                <Label>Numero FIR / Formulario *</Label>
                <Input value={firNumber} onChange={e => setFirNumber(e.target.value)} placeholder="Es: ABCDE 123456 FG" />
              </div>
              <div>
                <Label>Produttore (ragione sociale) *</Label>
                <Input value={produttore} onChange={e => setProduttore(e.target.value)} placeholder="Ragione sociale produttore" />
              </div>
              <div>
                <Label>Trasportatore</Label>
                <Input value={trasportatore} onChange={e => setTrasportatore(e.target.value)} placeholder="Ragione sociale trasportatore" />
              </div>
              <div>
                <Label>Data Ricezione *</Label>
                <Input type="date" value={dataRicezione} onChange={e => setDataRicezione(e.target.value)} />
              </div>
              <div>
                <Label>Causale Ingresso</Label>
                <Select value={causaleCode} onValueChange={setCausaleCode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAUSALI_INGRESSO.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 1: Articolo */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Articolo e quantità all'origine</h3>
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
                  <Label>Quantità all'origine (kg) *</Label>
                  <Input type="number" step="0.01" min="0" value={quantitaOrigine} onChange={e => setQuantitaOrigine(e.target.value)} placeholder="0.00" />
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
                <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Note opzionali..." />
              </div>
            </div>
          )}

          {/* Step 2: Peso a Destino */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Peso a destino</h3>
              </div>
              <div className="bg-muted/30 border border-border/30 rounded-lg p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Il movimento di carico diventerà "ufficiale" solo quando inserisci il peso verificato nel tuo impianto.
                  Se non hai ancora pesato, puoi procedere senza — il FIR sarà evidenziato in giallo nel registro.
                </p>
                <div className="flex items-center gap-3">
                  <Switch checked={hasPesoDestino} onCheckedChange={setHasPesoDestino} />
                  <Label className="cursor-pointer">Ho il peso a destino</Label>
                </div>
                {hasPesoDestino && (
                  <div>
                    <Label>Quantità a destino (kg) *</Label>
                    <Input type="number" step="0.01" min="0" value={quantitaDestino} onChange={e => setQuantitaDestino(e.target.value)} placeholder="0.00" />
                  </div>
                )}
                {!hasPesoDestino && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                    ⚖️ In attesa di peso a destino
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Riepilogo */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Riepilogo Ingresso</h3>
              <div className="bg-muted/20 border border-border/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">CARICO DESTINATARIO</Badge>
                  {!hasPesoDestino && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">⚖️ Peso provvisorio</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">N° FIR</p>
                    <p className="font-mono">{firNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Produttore</p>
                    <p>{produttore}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CER</p>
                    <p className="font-mono">{selectedItem?.codice_cer} — {selectedItem?.descrizione}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quantità origine</p>
                    <p className="font-mono">{parseFloat(quantitaOrigine || "0").toLocaleString("it-IT")} kg</p>
                  </div>
                  {hasPesoDestino && (
                    <div>
                      <p className="text-xs text-muted-foreground">Quantità a destino</p>
                      <p className="font-mono font-bold text-emerald-400">{parseFloat(quantitaDestino || "0").toLocaleString("it-IT")} kg</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Data</p>
                    <p>{new Date(dataRicezione).toLocaleDateString("it-IT")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Causale</p>
                    <p className="text-xs">{CAUSALI_INGRESSO.find(c => c.code === causaleCode)?.label}</p>
                  </div>
                  {trasportatore && (
                    <div>
                      <p className="text-xs text-muted-foreground">Trasportatore</p>
                      <p>{trasportatore}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2 pt-2">
            {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Indietro</Button>}
            <Button variant="outline" onClick={() => navigate(`/mn/admin/${context}/dragon/registro`)} className="ml-auto">Annulla</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}>Avanti</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Salvataggio..." : "Conferma Ingresso"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </MNAdminLayout>
  );
}
