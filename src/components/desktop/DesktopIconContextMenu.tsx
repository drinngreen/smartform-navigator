import { useEffect, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useIconStats, type IconChartData } from "@/hooks/useIconStats";
import { Loader2 } from "lucide-react";

interface Props {
  iconId: string | null;
  iconLabel: string;
  position: { x: number; y: number } | null;
  onClose: () => void;
}

function ChartBlock({ chart }: { chart: IconChartData }) {
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
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [position, onClose]);

  if (!position || !iconId) return null;

  return (
    <div
      ref={ref}
      className="fixed z-[9999] min-w-[240px] max-w-[300px] rounded-2xl border border-white/10 bg-black/90 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.6)] p-4 animate-in fade-in zoom-in-95 duration-200"
      style={{ left: position.x, top: position.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="mb-3 pb-2 border-b border-white/10">
        <span className="text-sm font-bold text-white">{iconLabel}</span>
        <span className="text-[10px] text-white/40 ml-2">Statistiche</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-white/50" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {charts?.map((chart, i) => (
            <ChartBlock key={i} chart={chart} />
          ))}
          {(!charts || charts.length === 0) && (
            <p className="text-xs text-white/40 text-center py-4">Nessun dato disponibile</p>
          )}
        </div>
      )}
    </div>
  );
}
