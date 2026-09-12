import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";

interface ScrollJumpButtonsProps {
  containerRef: React.RefObject<HTMLElement>;
  className?: string;
}

export function ScrollJumpButtons({ containerRef, className = "" }: ScrollJumpButtonsProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf: number;
    let ro: ResizeObserver | null = null;

    const attach = (el: HTMLElement) => {
      const check = () => {
        const canScroll = el.scrollHeight > el.clientHeight + 2;
        setVisible(canScroll);
      };
      check();
      el.addEventListener("scroll", check, { passive: true });
      ro = new ResizeObserver(check);
      ro.observe(el);
      return () => {
        el.removeEventListener("scroll", check);
        ro?.disconnect();
      };
    };

    const tryAttach = () => {
      const el = containerRef.current;
      if (!el) {
        raf = requestAnimationFrame(tryAttach);
        return;
      }
      attach(el);
    };

    tryAttach();
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [containerRef]);

  if (!visible) return null;

  const scrollTo = (position: "top" | "bottom") => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({
      top: position === "top" ? 0 : el.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex flex-col gap-2 ${className}`}
      aria-label="Navigazione rapida elenco"
    >
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-full border-emerald-500/50 bg-card/90 text-emerald-400 shadow-lg hover:bg-emerald-500/10 hover:text-emerald-300 backdrop-blur"
        onClick={() => scrollTo("top")}
        title="Vai in cima all'elenco"
        aria-label="Vai in cima all'elenco"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-full border-emerald-500/50 bg-card/90 text-emerald-400 shadow-lg hover:bg-emerald-500/10 hover:text-emerald-300 backdrop-blur"
        onClick={() => scrollTo("bottom")}
        title="Vai in fondo all'elenco"
        aria-label="Vai in fondo all'elenco"
      >
        <ArrowDown className="h-5 w-5" />
      </Button>
    </div>
  );
}
