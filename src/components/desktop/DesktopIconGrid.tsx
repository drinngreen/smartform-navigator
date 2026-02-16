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

const ICON_SPACING_X = 180;
const ICON_SPACING_Y = 190;
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
          className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
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
            style={{ left: icon.x, top: icon.y, width: 120 }}
            onMouseDown={(e) => handleMouseDown(e, icon)}
            onClick={() => handleClick(icon.href)}
          >
            <div className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 hover:bg-white/5 hover:shadow-[0_0_20px_rgba(251,191,36,0.1)]">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, rgba(${icon.color}, 0.15), rgba(${icon.color}, 0.05))`,
                  boxShadow: `0 0 20px rgba(${icon.color}, 0.1)`,
                }}
              >
                <img src={icon.iconImage} alt={icon.label} className="h-8 w-8" />
              </div>
              <span className="text-xs text-center font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {icon.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
