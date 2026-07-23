import { Package, Info } from "lucide-react";

interface Props { tenantId?: string; onCreated: () => void }

export function NoleggiTab({ tenantId: _tenantId, onCreated: _onCreated }: Props) {
  const oggi = new Date();
  const meseScorso = new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1);
  const meseLabel = meseScorso.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-orange-500/15 border border-orange-500/30">
            <Package className="h-6 w-6 text-orange-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Fatturazione Noleggi Cassoni</h3>
            <p className="text-sm text-muted-foreground">
              Voci di noleggio da fatturare — periodo: <strong className="text-orange-300 capitalize">{meseLabel}</strong>
            </p>
          </div>
        </div>

        <div className="p-8 rounded-xl border border-dashed border-border/40 bg-background/30 text-center">
          <Info className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Modulo Noleggi in preparazione: qui compariranno automaticamente i noleggi cassoni
            registrati a <strong>{meseLabel}</strong> e non ancora fatturati.
            Da qui potrai selezionarli e generare una fattura cumulativa in stato Cortesia,
            senza toccare il modulo Noleggi esistente (lettura sola).
          </p>
          <p className="text-xs text-muted-foreground/70 mt-3">
            La logica retroattiva mantiene visibili solo i noleggi del mese precedente al mese corrente.
          </p>
        </div>
      </div>
    </div>
  );
}
