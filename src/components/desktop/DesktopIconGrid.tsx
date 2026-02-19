import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DesktopIconContextMenu } from "./DesktopIconContextMenu";

export interface DesktopIconSubItem {
  label: string;
  iconImage: string;
  href: string;
  color: string;
}

export interface DesktopIconDef {
  id: string;
  label: string;
  iconImage: string;
  href: string;
  color: string;
  subItems?: DesktopIconSubItem[];
}

interface DesktopIcon extends DesktopIconDef {
  x: number;
  y: number;
}

const CELL_W = 180;
const CELL_H = 160;
const COLS = 6;
const PAD_X = 20;
const PAD_Y = 10;
const DEFAULT_STORAGE_KEY = "desktop-icon-positions";

/** Convert grid col/row to pixel position */
function cellToPixel(col: number, row: number) {
  return { x: col * CELL_W + PAD_X, y: row * CELL_H + PAD_Y };
}

/** Convert pixel position to nearest grid col/row */
function pixelToCell(x: number, y: number) {
  return {
    col: Math.max(0, Math.round((x - PAD_X) / CELL_W)),
    row: Math.max(0, Math.round((y - PAD_Y) / CELL_H)),
  };
}

function createPositionedIcons(items: DesktopIconDef[]): DesktopIcon[] {
  return items.filter(Boolean).map((item, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const { x, y } = cellToPixel(col, row);
    return { ...item, x, y };
  });
}

function loadPositions(storageKey: string): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePositions(icons: DesktopIcon[], storageKey: string) {
  const map: Record<string, { x: number; y: number }> = {};
  icons.forEach(ic => { if (ic) map[ic.id] = { x: ic.x, y: ic.y }; });
  localStorage.setItem(storageKey, JSON.stringify(map));
}

/** Find nearest free cell for an icon, avoiding occupied cells */
function findFreeCell(
  targetCol: number,
  targetRow: number,
  occupied: Set<string>,
  maxCols: number = COLS
): { col: number; row: number } {
  const key = (c: number, r: number) => `${c},${r}`;
  if (!occupied.has(key(targetCol, targetRow))) return { col: targetCol, row: targetRow };

  // Spiral search for nearest free cell
  for (let dist = 1; dist < 50; dist++) {
    for (let dc = -dist; dc <= dist; dc++) {
      for (let dr = -dist; dr <= dist; dr++) {
        if (Math.abs(dc) !== dist && Math.abs(dr) !== dist) continue;
        const c = targetCol + dc;
        const r = targetRow + dr;
        if (c < 0 || r < 0 || c >= maxCols) continue;
        if (!occupied.has(key(c, r))) return { col: c, row: r };
      }
    }
  }
  return { col: targetCol, row: targetRow };
}

function initIcons(defs: DesktopIconDef[], storageKey: string): DesktopIcon[] {
  const saved = loadPositions(storageKey);
  const defaults = createPositionedIcons(defs);
  const occupied = new Set<string>();
  const result: DesktopIcon[] = [];

  for (const icon of defaults) {
    if (!icon) { result.push(icon); continue; }
    const s = saved[icon.id];
    let finalX = icon.x, finalY = icon.y;
    if (s && typeof s.x === "number") { finalX = s.x; finalY = s.y; }

    // Snap to grid
    const { col, row } = pixelToCell(finalX, finalY);
    const key = `${col},${row}`;
    if (occupied.has(key)) {
      const free = findFreeCell(col, row, occupied);
      const pos = cellToPixel(free.col, free.row);
      occupied.add(`${free.col},${free.row}`);
      result.push({ ...icon, x: pos.x, y: pos.y });
    } else {
      occupied.add(key);
      const pos = cellToPixel(col, row);
      result.push({ ...icon, x: pos.x, y: pos.y });
    }
  }
  return result;
}

interface DesktopIconGridProps {
  icons: DesktopIconDef[];
  storageKey?: string;
}

export function DesktopIconGrid({ icons: iconDefs, storageKey = DEFAULT_STORAGE_KEY }: DesktopIconGridProps) {
  const navigate = useNavigate();
  const [icons, setIcons] = useState<DesktopIcon[]>(() => initIcons(iconDefs, storageKey));
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number; startX: number; startY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const DRAG_THRESHOLD = 5;
  const [contextMenu, setContextMenu] = useState<{ iconId: string; iconLabel: string; x: number; y: number; subItems?: DesktopIconSubItem[] } | null>(null);
  const prevDefsRef = useRef(iconDefs);
  if (prevDefsRef.current !== iconDefs) {
    prevDefsRef.current = iconDefs;
    setIcons(initIcons(iconDefs, storageKey));
  }

  const rows = Math.ceil(iconDefs.length / COLS);
  const minHeight = rows * CELL_H + 40;

  const handleMouseDown = useCallback((e: React.MouseEvent, icon: DesktopIcon) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const wasDragging = isDragging.current;
    isDragging.current = false;
    if (wasDragging) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    let didDrag = false;

    dragRef.current = {
      id: icon.id,
      offsetX: e.clientX - rect.left - icon.x,
      offsetY: e.clientY - rect.top - icon.y,
      startX: e.clientX,
      startY: e.clientY,
    };

    const handleMouseMove = (me: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const dx = Math.abs(me.clientX - dragRef.current.startX);
      const dy = Math.abs(me.clientY - dragRef.current.startY);
      if (!didDrag && (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD)) return;
      didDrag = true;
      isDragging.current = true;
      const r = containerRef.current.getBoundingClientRect();
      setIcons(prev => prev.map(ic =>
        ic.id === dragRef.current!.id
          ? {
              ...ic,
              x: Math.max(0, Math.min(r.width - 100, me.clientX - r.left - dragRef.current!.offsetX)),
              y: Math.max(0, Math.min(r.height - 100, me.clientY - r.top - dragRef.current!.offsetY)),
            }
          : ic
      ));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      dragRef.current = null;

      if (!didDrag) {
        navigate(icon.href);
      } else {
        // Snap to grid and resolve collisions
        setIcons(prev => {
          const draggedIdx = prev.findIndex(ic => ic.id === icon.id);
          if (draggedIdx === -1) return prev;
          const dragged = prev[draggedIdx];
          const { col, row } = pixelToCell(dragged.x, dragged.y);

          // Build occupied set from all other icons
          const occupied = new Set<string>();
          prev.forEach((ic, idx) => {
            if (idx === draggedIdx) return;
            const cell = pixelToCell(ic.x, ic.y);
            occupied.add(`${cell.col},${cell.row}`);
          });

          const free = findFreeCell(col, row, occupied);
          const pos = cellToPixel(free.col, free.row);
          const next = prev.map((ic, idx) =>
            idx === draggedIdx ? { ...ic, x: pos.x, y: pos.y } : ic
          );
          savePositions(next, storageKey);
          return next;
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [navigate, storageKey]);

  const resetPositions = useCallback(() => {
    const defaults = createPositionedIcons(iconDefs);
    setIcons(defaults);
    localStorage.removeItem(storageKey);
  }, [iconDefs, storageKey]);

  const handleContextMenu = useCallback((e: React.MouseEvent, icon: DesktopIcon) => {
    e.preventDefault();
    setContextMenu({ iconId: icon.id, iconLabel: icon.label, x: e.clientX, y: e.clientY, subItems: icon.subItems });
  }, []);

  return (
    <>
      <div className="flex justify-end mb-2">
        <button
          onClick={resetPositions}
          className="text-xs text-white/70 hover:text-white transition-colors font-mono"
        >
          Reset Desktop
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full select-none"
        style={{ minHeight }}
      >
        {icons.map((icon) => (
          <div
            key={icon.id}
            className="absolute cursor-grab active:cursor-grabbing group"
            style={{ left: icon.x, top: icon.y, width: 160 }}
            onMouseDown={(e) => handleMouseDown(e, icon)}
            onContextMenu={(e) => handleContextMenu(e, icon)}
          >
            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(251,191,36,0.2)]">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, rgba(${icon.color}, 0.25), rgba(${icon.color}, 0.1))`,
                  boxShadow: `0 0 30px rgba(${icon.color}, 0.5), 0 0 60px rgba(${icon.color}, 0.3), 0 0 90px rgba(${icon.color}, 0.15), inset 0 0 20px rgba(${icon.color}, 0.1)`,
                  border: `2px solid rgba(${icon.color}, 0.7)`,
                }}
              >
                <img src={icon.iconImage} alt={icon.label} className="h-12 w-12 transition-transform duration-300 group-hover:scale-200" loading="eager" decoding="async" fetchPriority="high" />
              </div>
              <span className="text-sm text-center font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] group-hover:text-white transition-colors">
                {icon.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      <DesktopIconContextMenu
        iconId={contextMenu?.iconId ?? null}
        iconLabel={contextMenu?.iconLabel ?? ""}
        position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
        subItems={contextMenu?.subItems}
        onClose={() => setContextMenu(null)}
      />
    </>
  );
}
