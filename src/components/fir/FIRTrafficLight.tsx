import { useFIRStore } from "@/stores/firStore";

export function FIRTrafficLight() {
  const data = useFIRStore((s) => s.data);

  const checks = [
    { label: "Produttore", ok: !!data.produttoreDenominazione },
    { label: "CER", ok: !!data.codiceEER },
    { label: "Quantità", ok: !!data.quantita && parseFloat(data.quantita) > 0 },
    { label: "Destinatario", ok: !!data.destinatarioDenominazione },
  ];

  const completedCount = checks.filter((c) => c.ok).length;
  const color = completedCount === 0 ? "bg-destructive" : completedCount === checks.length ? "bg-neon-green" : "bg-primary";

  return (
    <div className="flex items-center gap-2 mt-3">
      <div className={`w-3 h-3 rounded-full ${color} animate-pulse`} />
      <span className="text-xs font-mono text-muted-foreground">{completedCount}/{checks.length} campi compilati</span>
      <div className="flex gap-1 ml-auto">
        {checks.map((c, i) => (
          <div key={i} className={`w-2 h-2 rounded-full ${c.ok ? "bg-neon-green" : "bg-muted"}`} title={c.label} />
        ))}
      </div>
    </div>
  );
}
