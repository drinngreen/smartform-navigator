import { useFIRStore } from "@/stores/firStore";
import { useMNFIRStore } from "@/stores/mnFirStore";

const lights = [
  { key: 'bozza' as const, label: 'BOZZA', color: 'hsl(45, 93%, 47%)', shadow: 'rgba(234, 179, 8, 0.6)' },
  { key: 'inviato' as const, label: 'IN VIAGGIO', color: 'hsl(142, 71%, 45%)', shadow: 'rgba(34, 197, 94, 0.6)' },
  { key: 'chiuso' as const, label: 'ARRIVO', color: 'hsl(0, 84%, 60%)', shadow: 'rgba(239, 68, 68, 0.6)' },
] as const;

/**
 * Semaforo di stato del formulario.
 *
 * Le app Multy/Niyol lavorano su `useMNFIRStore`, mentre questo componente
 * leggeva soltanto `useFIRStore`: l'autista vedeva quindi un semaforo fermo,
 * scollegato dal formulario realmente aperto. Ora si legge lo stato del
 * formulario effettivamente attivo, qualunque sia lo store che lo gestisce.
 */
export function FIRTrafficLight() {
  const statusStandard = useFIRStore((s) => s.workflowStatus);
  const attivoStandard = useFIRStore((s) => !!s.data.selectedFirNumber || !!s.editingFirId);
  const statusMn = useMNFIRStore((s) => s.workflowStatus);
  const attivoMn = useMNFIRStore((s) => !!s.data.selectedFirNumber || !!s.editingFirId);

  const status = attivoMn ? statusMn : attivoStandard ? statusStandard : statusMn ?? statusStandard;
  const hasActiveFir = attivoMn || attivoStandard;

  const effectiveStatus = status || (hasActiveFir ? 'bozza' : null);

  return (
    <div className="flex items-center gap-4 mt-3 mb-1 py-2 px-3 rounded-xl glass-card border border-primary/15">
      {lights.map((light) => {
        const active = effectiveStatus === light.key;
        return (
          <div key={light.key} className="flex items-center gap-1.5">
            <div
              className={`w-4 h-4 rounded-full transition-all duration-500 ${active ? "animate-pulse scale-110" : ""}`}
              style={{
                backgroundColor: active ? light.color : 'hsl(var(--muted))',
                boxShadow: active ? `0 0 16px ${light.shadow}, 0 0 32px ${light.shadow}` : 'none',
                opacity: active ? 1 : 0.2,
              }}
            />
            <span
              className={`text-[10px] font-mono font-bold tracking-wider transition-all ${active ? "text-glow" : ""}`}
              style={{ 
                color: active ? light.color : 'rgba(255,255,255,0.7)',
                textShadow: active ? `0 0 8px ${light.shadow}` : 'none',
              }}
            >
              {light.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
