import { useState } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";

/**
 * Compilazione di un nuovo FIR cartaceo dall'ufficio: stesso modulo standard,
 * già impostato su "cartaceo" (salva e stampa, nessun invio al RENTRI).
 */
export function NuovoFirCartaceoBox({ tenantId, mnContext }: { tenantId: string; mnContext: "multyproget" | "niyol" }) {
  const [aperto, setAperto] = useState(false);
  if (!aperto) {
    return (
      <Button onClick={() => setAperto(true)} className="gap-2 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/40">
        <Printer className="h-4 w-4" /> Nuovo FIR cartaceo (compila e stampa)
      </Button>
    );
  }
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-card/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-amber-300">Nuovo FIR cartaceo</p>
        <Button size="sm" variant="ghost" onClick={() => setAperto(false)} className="gap-1"><X className="h-4 w-4" /> Chiudi</Button>
      </div>
      <MNFIRFormComplete tenantId={tenantId} mnContext={mnContext} creationMode initialFormato="cartaceo" />
    </div>
  );
}
