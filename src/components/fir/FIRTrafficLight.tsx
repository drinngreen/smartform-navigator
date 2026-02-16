import { useFIRStore } from "@/stores/firStore";

type WorkflowStatus = 'bozza' | 'inviato' | 'chiuso' | null;

const lights = [
  { key: 'bozza' as const, label: 'BOZZA', color: 'hsl(45, 93%, 47%)', shadow: 'rgba(234, 179, 8, 0.6)' },
  { key: 'inviato' as const, label: 'IN VIAGGIO', color: 'hsl(142, 71%, 45%)', shadow: 'rgba(34, 197, 94, 0.6)' },
  { key: 'chiuso' as const, label: 'ARRIVO', color: 'hsl(0, 84%, 60%)', shadow: 'rgba(239, 68, 68, 0.6)' },
] as const;

export function FIRTrafficLight() {
  const status = useFIRStore((s) => s.workflowStatus);
  const hasActiveFir = useFIRStore((s) => !!s.data.selectedFirNumber || !!s.editingFirId);

  // If there's an active FIR but no explicit status, default to 'bozza'
  const effectiveStatus = status || (hasActiveFir ? 'bozza' : null);

  return (
    <div className="flex items-center gap-3 mt-3 mb-1">
      {lights.map((light) => {
        const active = effectiveStatus === light.key;
        return (
          <div key={light.key} className="flex items-center gap-1.5">
            <div
              className="w-3.5 h-3.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: active ? light.color : 'hsl(var(--muted))',
                boxShadow: active ? `0 0 12px ${light.shadow}` : 'none',
                opacity: active ? 1 : 0.3,
              }}
            />
            <span
              className="text-[10px] font-mono font-bold tracking-wider transition-colors"
              style={{ color: active ? light.color : 'hsl(var(--muted-foreground))' }}
            >
              {light.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
