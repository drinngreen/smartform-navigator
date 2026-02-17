import { useEffect, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useIconStats, type IconChartData } from "@/hooks/useIconStats";
import { Loader2, X, Construction } from "lucide-react";

interface Props {
  iconId: string | null;
  iconLabel: string;
  position: { x: number; y: number } | null;
  onClose: () => void;
}

function ChartBlock({ chart }: { chart: IconChartData }) {
  if (chart.title === "__IN_SVILUPPO__") {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <Construction className="h-8 w-8 text-amber-400/70" />
        <p className="text-xs text-white/50 font-medium">App in sviluppo</p>
        <p className="text-[10px] text-white/30">Dati non ancora disponibili</p>
      </div>
    );
  }

  if (!chart.data.length || chart.data.every((d) => d.value === 0)) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-white/50">Nessun dato</p>
      </div>
    );
  }

  if (chart.type === "pie") {
    return (
      <div className="flex flex-col items-center gap-2">
        <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">{chart.title}</h4>
        <ResponsiveContainer width={180} height={150}>
          <PieChart>
            <Pie
              data={chart.data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={55}
              innerRadius={25}
              strokeWidth={0}
            >
              {chart.data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
              itemStyle={{ color: "#fff" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-2 justify-center">
          {chart.data.map((d, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              <span className="text-[10px] text-white/60">{d.name}: {d.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">{chart.title}</h4>
      <ResponsiveContainer width={200} height={120}>
        <BarChart data={chart.data}>
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
            itemStyle={{ color: "#fff" }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chart.data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DesktopIconContextMenu({ iconId, iconLabel, position, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { data: charts, isLoading } = useIconStats(iconId);

  useEffect(() => {
    if (!position) return;
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("keydown", escHandler);
    };
  }, [position, onClose]);

  if (!position || !iconId) return null;

  // Clamp position so the popup stays visible
  const popupW = 320;
  const popupH = 350;
  const x = Math.min(position.x, window.innerWidth - popupW - 16);
  const y = Math.min(position.y, window.innerHeight - popupH - 16);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-black/40" onClick={onClose} />

      {/* Popup */}
      <div
        ref={ref}
        className="fixed z-[9999] w-[300px] max-h-[80vh] overflow-y-auto rounded-2xl border border-white/15 bg-black/95 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200"
        style={{ left: x, top: y }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Header with close button */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 pb-3 border-b border-white/10 bg-black/95 backdrop-blur-xl rounded-t-2xl">
          <div>
            <span className="text-sm font-bold text-white">{iconLabel}</span>
            <span className="text-[10px] text-white/40 ml-2">Statistiche</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4 text-white/70" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-white/50" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {charts?.map((chart, i) => (
                <ChartBlock key={i} chart={chart} />
              ))}
              {(!charts || charts.length === 0) && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <Construction className="h-8 w-8 text-amber-400/70" />
                  <p className="text-xs text-white/50">App in sviluppo</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
