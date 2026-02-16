import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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

function createPositionedIcons(items: DesktopIconDef[]): DesktopIcon[] {
  return items.map((item, i) => ({
    ...item,
    x: (i % COLS) * ICON_SPACING_X + 40,
    y: Math.floor(i / COLS) * ICON_SPACING_Y + 20,
  }));
}

interface DesktopIconGridProps {
  icons: DesktopIconDef[];
}

export function DesktopIconGrid({ icons: iconDefs }: DesktopIconGridProps) {
  const navigate = useNavigate();
  const [icons, setIcons] = useState<DesktopIcon[]>(() => createPositionedIcons(iconDefs));
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const prevDefsRef = useRef(iconDefs);
  if (prevDefsRef.current !== iconDefs) {
    prevDefsRef.current = iconDefs;
    setIcons(createPositionedIcons(iconDefs));
  }

  const rows = Math.ceil(iconDefs.length / COLS);
  const minHeight = rows * ICON_SPACING_Y + 40;

  const handleMouseDown = useCallback((e: React.MouseEvent, icon: DesktopIcon) => {
    isDragging.current = false;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      id: icon.id,
      offsetX: e.clientX - rect.left - icon.x,
      offsetY: e.clientY - rect.top - icon.y,
    };
    const handleMouseMove = (me: MouseEvent) => {
      isDragging.current = true;
      if (!dragRef.current || !containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      setIcons(prev =>
        prev.map(ic =>
          ic.id === dragRef.current!.id
            ? {
                ...ic,
                x: Math.max(0, Math.min(r.width - 100, me.clientX - r.left - dragRef.current!.offsetX)),
                y: Math.max(0, Math.min(r.height - 100, me.clientY - r.top - dragRef.current!.offsetY)),
              }
            : ic
        )
      );
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      setTimeout(() => { isDragging.current = false; }, 50);
      dragRef.current = null;
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  const handleClick = useCallback(
    (href: string) => {
      if (!isDragging.current) navigate(href);
    },
    [navigate]
  );

  const resetPositions = useCallback(() => {
    setIcons(createPositionedIcons(iconDefs));
  }, [iconDefs]);

  return (
    <>
      {/* Reset button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={resetPositions}
          className="text-xs text-white/70 hover:text-white transition-colors font-mono"
        >
          Reset Desktop
        </button>
      </div>

      {/* Desktop area */}
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
            onClick={() => handleClick(icon.href)}
          >
            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(251,191,36,0.2)]">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-125"
                style={{
                  background: `linear-gradient(135deg, rgba(${icon.color}, 0.25), rgba(${icon.color}, 0.1))`,
                  boxShadow: `0 0 30px rgba(${icon.color}, 0.5), 0 0 60px rgba(${icon.color}, 0.3), 0 0 90px rgba(${icon.color}, 0.15), inset 0 0 20px rgba(${icon.color}, 0.1)`,
                  border: `2px solid rgba(${icon.color}, 0.7)`,
                }}
              >
                <img src={icon.iconImage} alt={icon.label} className="h-12 w-12" />
              </div>
              <span className="text-sm text-center font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] group-hover:text-white transition-colors">
                {icon.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
