import { useMemo } from "react";
import type { DragonLot } from "@/hooks/dragon/useDragonLots";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CornerDownRight, GitBranch, PackageOpen } from "lucide-react";

interface Props {
  lots: DragonLot[];
  selectedLotId: string | null;
  onSelect: (id: string) => void;
}

function LotNode({
  lot,
  lots,
  depth,
  onSelect,
  selectedLotId,
}: {
  lot: DragonLot;
  lots: DragonLot[];
  depth: number;
  onSelect: (id: string) => void;
  selectedLotId: string | null;
}) {
  const children = lots.filter((l) => l.parent_lot_id === lot.id);
  const isSelected = lot.id === selectedLotId;

  return (
    <div className="relative" style={{ marginLeft: depth === 0 ? 0 : 22 }}>
      <button
        onClick={() => onSelect(lot.id)}
        className={`w-full text-left flex items-center gap-2 rounded-lg border px-3 py-2 mb-1.5 transition-colors ${
          isSelected
            ? "border-emerald-400/60 bg-emerald-500/15"
            : "border-border/30 bg-card/50 hover:bg-card/80"
        }`}
      >
        {depth > 0 && <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <span className="font-mono text-xs font-semibold">{lot.lot_code}</span>
        <Badge variant="outline" className="text-[10px]">{lot.item?.codice_cer ?? "—"}</Badge>
        <Badge variant="outline" className="text-[10px]">{lot.origin ?? "CERNITA"}</Badge>
        <span className="ml-auto text-xs tabular-nums font-semibold">
          {lot.balance.toLocaleString("it-IT", { maximumFractionDigits: 2 })} kg
        </span>
      </button>
      {children.map((c) => (
        <div key={c.id} className="border-l border-border/30 pl-1">
          <LotNode lot={c} lots={lots} depth={depth + 1} onSelect={onSelect} selectedLotId={selectedLotId} />
        </div>
      ))}
    </div>
  );
}

export function DragonLotTree({ lots, selectedLotId, onSelect }: Props) {
  const roots = useMemo(
    () => lots.filter((l) => !l.parent_lot_id || !lots.some((p) => p.id === l.parent_lot_id)),
    [lots],
  );
  const selected = lots.find((l) => l.id === selectedLotId) ?? null;

  const ancestry = useMemo(() => {
    const chain: DragonLot[] = [];
    let cur = selected;
    const guard = new Set<string>();
    while (cur?.parent_lot_id && !guard.has(cur.parent_lot_id)) {
      guard.add(cur.parent_lot_id);
      const parent = lots.find((l) => l.id === cur!.parent_lot_id);
      if (!parent) break;
      chain.unshift(parent);
      cur = parent;
    }
    return chain;
  }, [selected, lots]);

  const movements = useMemo(
    () => [...(selected?.movements ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [selected],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="bg-card/60 border border-border/30 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-emerald-300 flex items-center gap-2 mb-3">
          <GitBranch className="h-4 w-4" /> Albero lotti
        </h4>
        {roots.length === 0 && <p className="text-xs text-muted-foreground">Nessun lotto registrato.</p>}
        <div className="max-h-[520px] overflow-auto pr-1">
          {roots.map((r) => (
            <LotNode key={r.id} lot={r} lots={lots} depth={0} onSelect={onSelect} selectedLotId={selectedLotId} />
          ))}
        </div>
      </div>

      <div className="bg-card/60 border border-border/30 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-emerald-300 flex items-center gap-2 mb-3">
          <PackageOpen className="h-4 w-4" /> Dettaglio tracciabilità
        </h4>
        {!selected && <p className="text-xs text-muted-foreground">Seleziona un lotto per vedere la filiera completa.</p>}
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {ancestry.map((a) => (
                <span key={a.id} className="flex items-center gap-1.5">
                  <button onClick={() => onSelect(a.id)} className="font-mono px-2 py-0.5 rounded bg-muted/40 hover:bg-muted">
                    {a.lot_code}
                  </button>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </span>
              ))}
              <span className="font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">{selected.lot_code}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">CER:</span> <span className="font-mono">{selected.item?.codice_cer ?? "—"}</span></div>
              <div><span className="text-muted-foreground">Giacenza:</span> <span className="font-semibold">{selected.balance.toLocaleString("it-IT")} kg</span></div>
              <div><span className="text-muted-foreground">Produzione:</span> {selected.production_date ?? "—"}</div>
              <div><span className="text-muted-foreground">Stato:</span> {selected.status ?? "ATTIVO"}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Descrizione:</span> {selected.item?.descrizione ?? "—"}</div>
              {selected.notes && <div className="col-span-2"><span className="text-muted-foreground">Note:</span> {selected.notes}</div>}
            </div>

            <div>
              <p className="text-xs font-semibold mb-2">Movimenti del lotto</p>
              <div className="space-y-1 max-h-[300px] overflow-auto pr-1">
                {movements.length === 0 && <p className="text-xs text-muted-foreground">Nessun movimento.</p>}
                {movements.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-xs border border-border/20 rounded-md px-2 py-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${m.sign === "PLUS" ? "text-emerald-400 border-emerald-500/40" : "text-red-400 border-red-500/40"}`}
                    >
                      {m.sign === "PLUS" ? "+" : "−"}
                    </Badge>
                    <span className="tabular-nums font-semibold">{Number(m.quantity).toLocaleString("it-IT")} kg</span>
                    <span className="text-muted-foreground truncate">{m.note ?? ""}</span>
                    <span className="ml-auto text-muted-foreground whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString("it-IT")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
