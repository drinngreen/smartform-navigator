import type { FirEvent } from "@/types/impiantoFir";
import { CheckCircle, AlertTriangle, PenTool, Download, Clock } from "lucide-react";

const EVENT_ICONS: Record<string, typeof CheckCircle> = {
  importato: Download,
  firma_ricezione: PenTool,
  firma_destinatario: CheckCircle,
  errore: AlertTriangle,
};

interface Props {
  events: FirEvent[];
  color: string;
}

export function ImpiantoFirTimeline({ events, color }: Props) {
  if (!events.length) return (
    <div className="text-muted-foreground text-sm text-center py-4">Nessun evento registrato</div>
  );

  return (
    <div className="space-y-3">
      {events.map((ev, i) => {
        const Icon = EVENT_ICONS[ev.tipo] || Clock;
        return (
          <div key={ev.id || i} className="flex gap-3 items-start">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `rgba(${color}, 0.15)` }}>
                <Icon className="h-4 w-4" style={{ color: `rgb(${color})` }} />
              </div>
              {i < events.length - 1 && <div className="w-px flex-1 min-h-[20px] bg-border/30 mt-1" />}
            </div>
            <div className="flex-1 pb-3">
              <p className="text-sm font-medium text-foreground">{ev.descrizione}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {new Date(ev.timestamp).toLocaleString("it-IT")}
                {ev.actor && <span className="ml-2">· {ev.actor}</span>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
