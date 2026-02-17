import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DesktopIconContextMenu } from "./DesktopIconContextMenu";

export interface DesktopIconDef {
  id: string;
  label: string;
  iconImage: string;
  href: string;
  color: string;
}

interface DesktopIcon extends DesktopIconDef {
  x: number;
  y: number;
}

const ICON_SPACING_X = 220;
const ICON_SPACING_Y = 240;
const COLS = 5;
const STORAGE_KEY = "desktop-icon-positions";

function createPositionedIcons(items: DesktopIconDef[]): DesktopIcon[] {
  return items.map((item, i) => ({
    ...item,
    x: (i % COLS) * ICON_SPACING_X + 40,
    y: Math.floor(i / COLS) * ICON_SPACING_Y + 20,
  }));
}

function loadPositions(): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePositions(icons: DesktopIcon[]) {
  const map: Record<string, { x: number; y: number }> = {};
  icons.forEach(ic => { map[ic.id] = { x: ic.x, y: ic.y }; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function initIcons(defs: DesktopIconDef[]): DesktopIcon[] {
  const saved = loadPositions();
  const defaults = createPositionedIcons(defs);
  return defaults.map(icon => saved[icon.id] ? { ...icon, ...saved[icon.id] } : icon);
}

interface DesktopIconGridProps {
  icons: DesktopIconDef[];
}

export function DesktopIconGrid({ icons: iconDefs }: DesktopIconGridProps) {
  const navigate = useNavigate();
  const [icons, setIcons] = useState<DesktopIcon[]>(() => initIcons(iconDefs));
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number; startX: number; startY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const DRAG_THRESHOLD = 5;
  const [contextMenu, setContextMenu] = useState<{ iconId: string; iconLabel: string; x: number; y: number } | null>(null);
  const prevDefsRef = useRef(iconDefs);
  if (prevDefsRef.current !== iconDefs) {
    prevDefsRef.current = iconDefs;
    setIcons(initIcons(iconDefs));
  }

  const rows = Math.ceil(iconDefs.length / COLS);
  const minHeight = rows * ICON_SPACING_Y + 40;

  const handleMouseDown = useCallback((e: React.MouseEvent, icon: DesktopIcon) => {
    if (e.button !== 0) return; // only left click
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
      setIcons(prev => {
        const next = prev.map(ic =>
          ic.id === dragRef.current!.id
            ? {
                ...ic,
                x: Math.max(0, Math.min(r.width - 100, me.clientX - r.left - dragRef.current!.offsetX)),
                y: Math.max(0, Math.min(r.height - 100, me.clientY - r.top - dragRef.current!.offsetY)),
              }
            : ic
        );
        return next;
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      dragRef.current = null;

      if (!didDrag) {
        navigate(icon.href);
      } else {
        // Persist positions after drag
        setIcons(prev => {
          savePositions(prev);
          return prev;
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [navigate]);

  const resetPositions = useCallback(() => {
    const defaults = createPositionedIcons(iconDefs);
    setIcons(defaults);
    localStorage.removeItem(STORAGE_KEY);
  }, [iconDefs]);

  const handleContextMenu = useCallback((e: React.MouseEvent, icon: DesktopIcon) => {
    e.preventDefault();
    setContextMenu({ iconId: icon.id, iconLabel: icon.label, x: e.clientX, y: e.clientY });
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
                <img src={icon.iconImage} alt={icon.label} className="h-12 w-12 transition-transform duration-300 group-hover:scale-200" />
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
        onClose={() => setContextMenu(null)}
      />
    </>
  );
}
