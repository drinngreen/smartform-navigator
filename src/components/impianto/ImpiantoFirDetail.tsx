import { useState } from "react";
import { PenTool, CheckCircle, Loader2, AlertTriangle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImpiantoFirTimeline } from "./ImpiantoFirTimeline";
import type { FirSummary, FirEvent } from "@/types/impiantoFir";
import { toast } from "sonner";

interface Props {
  item: FirSummary | null;
  events: FirEvent[];
  color: string;
  onClose: () => void;
  onSignReception: (payload: { kg_pesata: number; data_arrivo: string; ora_arrivo: string; esito: "accettato" | "parziale" | "respinto"; motivazione?: string }) => Promise<void>;
  onSignDestination: (payload: { kg_pesata: number; data_arrivo: string; ora_arrivo: string; esito: "accettato" | "parziale" | "respinto"; motivazione?: string }) => Promise<void>;
  forceDestinationOnly?: boolean;
  destinationActionLabel?: string;
}

export function ImpiantoFirDetail({
  item,
  events,
  color,
  onClose,
  onSignReception,
  onSignDestination,
  forceDestinationOnly = false,
  destinationActionLabel = "FIRMA DESTINATARIO",
}: Props) {
  const [form, setForm] = useState({ kg: "", data: new Date().toISOString().slice(0, 10), ora: new Date().toTimeString().slice(0, 5), esito: "accettato" as const, motivazione: "" });
  const [signing, setSigning] = useState(false);
  const [confirmDestinazione, setConfirmDestinazione] = useState(false);
  const [confermaText, setConfermaText] = useState("");

  if (!item) return null;

  const canSignReception = !forceDestinationOnly && (item.stato_interno === "importato" || item.stato_interno === "attesa_firma_ricezione");
  const canSignDestination = forceDestinationOnly || item.stato_interno === "firmato_ricezione";

  const handleSign = async (type: "reception" | "destination") => {
    if (!form.kg) { toast.error("Inserisci il peso della pesata"); return; }
    if (type === "destination" && confermaText !== "CONFERMO") { toast.error("Digita CONFERMO per procedere"); return; }
    setSigning(true);
    try {
      const payload = {
        kg_pesata: parseFloat(form.kg),
        data_arrivo: form.data,
        ora_arrivo: form.ora,
        esito: form.esito,
        motivazione: form.motivazione || undefined,
      };
      if (type === "reception") await onSignReception(payload);
      else await onSignDestination(payload);
      toast.success(type === "reception" ? "Firma ricezione eseguita!" : "Firma destinatario eseguita — FIR chiuso!");
      setConfirmDestinazione(false);
      setConfermaText("");
    } catch (err: any) {
      toast.error("Errore firma: " + err.message);
    } finally {
      setSigning(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl bg-card border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display tracking-wider">
            <PenTool className="h-5 w-5" style={{ color: `rgb(${color})` }} />
            Dettaglio xFIR — {item.numero_fir}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              item.firma_ricezione_at ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-muted/20 text-muted-foreground border-border/30"
            }`}>
              Firma Ricezione {item.firma_ricezione_at ? "✓" : "—"}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              item.firma_destinatario_at ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-muted/20 text-muted-foreground border-border/30"
            }`}>
              Firma Destinatario {item.firma_destinatario_at ? "✓" : "—"}
            </span>
          </div>

          {/* Read-only data */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground text-xs">CER:</span><br/><strong className="font-mono">{item.cer}</strong></div>
            <div><span className="text-muted-foreground text-xs">Quantità dichiarata:</span><br/><strong>{item.quantita?.toLocaleString("it-IT")} {item.unita_misura}</strong></div>
            <div><span className="text-muted-foreground text-xs">Produttore:</span><br/>{item.produttore || "—"}</div>
            <div><span className="text-muted-foreground text-xs">Trasportatore:</span><br/>{item.trasportatore || "—"}</div>
            <div><span className="text-muted-foreground text-xs">Destinatario:</span><br/>{item.destinatario || "—"}</div>
            <div><span className="text-muted-foreground text-xs">Data ricezione:</span><br/>{new Date(item.data_ricezione).toLocaleDateString("it-IT")}</div>
          </div>

          {/* Action form */}
          {(canSignReception || canSignDestination) && (
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `rgba(${color}, 0.3)`, background: `rgba(${color}, 0.05)` }}>
              <h4 className="font-display text-sm tracking-wider" style={{ color: `rgb(${color})` }}>
                {canSignReception ? "Presa in Carico" : forceDestinationOnly ? "Accettazione e Firma Scarico" : "Chiusura Definitiva"}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Peso pesata (kg)</label>
                  <input type="number" value={form.kg} onChange={(e) => setForm(p => ({ ...p, kg: e.target.value }))} placeholder="0.00" className="w-full mt-1 px-3 py-2 rounded-lg bg-background/80 border border-border/30 text-foreground font-mono" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Esito</label>
                  <select value={form.esito} onChange={(e) => setForm(p => ({ ...p, esito: e.target.value as any }))} className="w-full mt-1 px-3 py-2 rounded-lg bg-background/80 border border-border/30 text-foreground">
                    <option value="accettato">Accettato</option>
                    <option value="parziale">Parzialmente accettato</option>
                    <option value="respinto">Respinto</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Data arrivo</label>
                  <input type="date" value={form.data} onChange={(e) => setForm(p => ({ ...p, data: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg bg-background/80 border border-border/30 text-foreground font-mono" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Ora arrivo</label>
                  <input type="time" value={form.ora} onChange={(e) => setForm(p => ({ ...p, ora: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg bg-background/80 border border-border/30 text-foreground font-mono" />
                </div>
              </div>
              {form.esito !== "accettato" && (
                <div>
                  <label className="text-xs text-muted-foreground">Motivazione</label>
                  <textarea value={form.motivazione} onChange={(e) => setForm(p => ({ ...p, motivazione: e.target.value }))} rows={2} className="w-full mt-1 px-3 py-2 rounded-lg bg-background/80 border border-border/30 text-foreground resize-none" />
                </div>
              )}

              <div className="flex gap-2">
                {canSignReception && (
                  <button
                    onClick={() => handleSign("reception")}
                    disabled={signing}
                    className="flex-1 py-3 rounded-xl font-display font-semibold tracking-wider text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: `rgb(${color})` }}
                  >
                    {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />}
                    FIRMA RICEZIONE
                  </button>
                )}
                {canSignDestination && (
                  <button
                    onClick={() => setConfirmDestinazione(true)}
                    disabled={signing}
                    className="flex-1 py-3 rounded-xl font-display font-semibold tracking-wider bg-emerald-600 text-white hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" /> {destinationActionLabel}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Confirm destination modal */}
          {confirmDestinazione && (
            <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-display text-sm tracking-wider">CONFERMA CHIUSURA DEFINITIVA</span>
              </div>
              <p className="text-sm text-muted-foreground">
                La firma destinatario chiude definitivamente il FIR su RENTRI. Questa operazione è <strong>irreversibile</strong>.
              </p>
              <div>
                <label className="text-xs text-muted-foreground">Digita "CONFERMO" per procedere</label>
                <input value={confermaText} onChange={(e) => setConfermaText(e.target.value.toUpperCase())} className="w-full mt-1 px-3 py-2 rounded-lg bg-background/80 border border-red-500/30 text-foreground font-mono" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setConfirmDestinazione(false); setConfermaText(""); }} className="flex-1 py-2 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-colors">
                  Annulla
                </button>
                <button
                  onClick={() => handleSign("destination")}
                  disabled={signing || confermaText !== "CONFERMO"}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-display font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  CHIUDI FIR
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h4 className="font-display text-sm tracking-wider text-muted-foreground mb-3">TIMELINE EVENTI</h4>
            <ImpiantoFirTimeline events={events} color={color} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
