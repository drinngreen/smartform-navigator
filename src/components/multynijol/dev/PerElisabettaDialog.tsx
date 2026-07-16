import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export function PerElisabettaDialog() {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"none" | "no" | "yes-loading" | "yes-done">("none");
  const [result, setResult] = useState<{ inserted: number; skipped: number; routedToNiyol?: number; errors: string[] } | null>(null);

  const handleYes = async () => {
    setDecision("yes-loading");
    try {
      const { data, error } = await supabase.functions.invoke("import-elisabetta", { body: {} });
      if (error) throw error;
      setResult(data);
      setDecision("yes-done");
      localStorage.setItem("mn_niyol_tab_enabled", "1");
      toast.success(`Import completato: ${data.inserted} nuovi FIR (${data.routedToNiyol ?? 0} instradati a Niyol), ${data.skipped} doppioni saltati.`);
      window.dispatchEvent(new Event("mn-niyol-tab-toggle"));
    } catch (e: any) {
      toast.error("Errore import: " + e.message);
      setDecision("none");
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-5 py-4 mb-4 rounded-xl border-2 border-pink-500/50 bg-gradient-to-r from-pink-500/10 to-fuchsia-500/10 hover:from-pink-500/20 hover:to-fuchsia-500/20 transition-all text-left shadow-lg"
      >
        <Mail size={22} className="text-pink-400" />
        <div>
          <div className="font-bold text-base text-pink-300">📋 Per Elisabetta</div>
          <div className="text-xs text-muted-foreground">Report import dati + quesito approvazione</div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">📋 Per Elisabetta — Approvazione import dati</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-border/50 bg-card/40 p-4 space-y-2">
              <h3 className="font-semibold text-base text-emerald-400">Stato attuale del sistema</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <b>Multyproget</b>: tenant attivo con 13 ragazzi, 23 FIR esistenti, 150 movimenti impianto.</li>
                <li>• <b>Niyol</b>: tenant esistente ma vuoto (0 ragazzi, 0 FIR, 0 movimenti) — di fatto non operativa.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-border/50 bg-card/40 p-4 space-y-2">
              <h3 className="font-semibold text-base text-cyan-400">Cosa contengono i 3 file Excel allegati</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <b>MULTY_PROGET_IMPIANTO</b>: 89 formulari ufficiali (Multy come produttore o destinatario; molti trasportati da Niyol Eticons).</li>
                <li>• <b>CONTO_PROPRIO</b>: 360 bozze formulario con targa <code>DL163FW</code> (Multy come produttore/trasportatore/destinatario).</li>
                <li>• <b>CERNITE_MULTY_PROGET</b>: 57 movimenti di registro lavorazione (NON importati ora — il modulo Magazzino Dragon richiede mappatura specifica con Riccardo).</li>
              </ul>
            </div>

            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 space-y-2">
              <h3 className="font-semibold text-base text-yellow-300">Doppioni rilevati (saranno SALTATI)</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <code>HQXVN 000229 FJ</code> già presente in DB → 1 riga saltata da IMPIANTO</li>
                <li>• <code>FRVKM 000846 ZD</code> e <code>FRVKM 000847 KF</code> presenti sia in IMPIANTO che in CONTO_PROPRIO → 2 righe saltate</li>
              </ul>
            </div>

            <div className="rounded-lg border-2 border-pink-500/50 bg-pink-500/10 p-4 space-y-3">
              <h3 className="font-bold text-base text-pink-300">QUESITO PER ELISABETTA</h3>
              <p className="text-foreground">
                Si conferma di procedere con:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                <li>Inserire <b>~446 nuovi FIR</b> (88 impianto + 358 conto proprio) come bozze nel tenant <b>Multyproget</b>, saltando i 3 doppioni.</li>
                <li>Aggiungere il tab <b>"Niyol"</b> alla dashboard Dev Multy (vista parallela per gestire i dati Niyol da qui).</li>
                <li>Le righe in cui Niyol è solo trasportatore restano sul FIR Multy (Niyol vedrà i suoi propri formulari quando arriveranno).</li>
                <li>Le 57 righe Cernite restano in attesa: vanno mappate su Dragon con Riccardo.</li>
              </ol>
              <p className="text-xs text-yellow-300/90">
                ⚠️ Nessun dato esistente verrà eliminato o modificato. Solo inserimento di nuovi record.
              </p>
            </div>

            {decision === "yes-done" && result && (
              <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4 space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <CheckCircle2 size={18} /> Import completato
                </div>
                <div className="text-muted-foreground">Inseriti: <b>{result.inserted}</b> · Saltati (doppioni): <b>{result.skipped}</b></div>
                {result.errors?.length > 0 && (
                  <details className="text-xs mt-2">
                    <summary className="cursor-pointer text-yellow-300">Errori riscontrati ({result.errors.length})</summary>
                    <pre className="mt-1 text-xs whitespace-pre-wrap">{result.errors.join("\n")}</pre>
                  </details>
                )}
              </div>
            )}

            {decision === "no" && (
              <div className="rounded-lg border-2 border-red-500/60 bg-red-500/10 p-5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-red-300 text-base">
                  <XCircle size={20} /> Import bloccato
                </div>
                <p className="text-foreground">
                  Tutte le modifiche sono state <b>annullate</b>. Nessun dato è stato importato e il tab Niyol non è stato attivato.
                </p>
                <p className="text-yellow-300 font-medium">
                  📞 Comunicare a <b>Riccardo</b> come procedere prima di rifare il tentativo.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
            {decision === "none" && (
              <>
                <Button variant="destructive" onClick={() => setDecision("no")} className="gap-2">
                  <XCircle size={16} /> NO — blocca tutto
                </Button>
                <Button onClick={handleYes} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 size={16} /> SÌ — attiva tutto
                </Button>
              </>
            )}
            {decision === "yes-loading" && (
              <Button disabled className="gap-2">
                <Loader2 size={16} className="animate-spin" /> Import in corso…
              </Button>
            )}
            {(decision === "yes-done" || decision === "no") && (
              <Button variant="outline" onClick={() => setOpen(false)}>Chiudi</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
