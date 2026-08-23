import { useEffect, useMemo, useRef, useState } from "react";
import { Star } from "lucide-react";
import { useConferimentoCerOptions, type ConferimentoCerOption } from "@/hooks/useConferimentoCerOptions";

interface CerPickerFieldProps {
  value: string;
  onSelect: (codice: string, descrizione: string, pericoloso: boolean) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** stile "overlay" per il modulo alternativo (input sovrapposto al modulo fisico) */
  overlay?: boolean;
  overlayStyle?: React.CSSProperties;
  inputClassName?: string;
  label?: string;
}

const normalize = (code: string) => String(code ?? "").replace(/\D/g, "");

export function formatCerCode(code: string) {
  const digits = normalize(code);
  return digits.length === 6 ? `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)}` : code;
}

export function CerPickerField({
  value,
  onSelect,
  onChange,
  placeholder = "es. 17 04 05",
  overlay = false,
  overlayStyle,
  inputClassName,
  label,
}: CerPickerFieldProps) {
  const { preferiti, tutti } = useConferimentoCerOptions();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const preferredCodes = useMemo(() => new Set(preferiti.map((e) => normalize(e.codice))), [preferiti]);

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("it");
    const digits = q.replace(/\D/g, "");
    const base: ConferimentoCerOption[] = showAll || q.length > 0 ? tutti : preferiti;
    return base
      .filter((entry) => {
        if (!q) return true;
        const matchCode = digits.length > 0 && normalize(entry.codice).includes(digits);
        const matchText = (entry.descrizione || "").toLocaleLowerCase("it").includes(q);
        return matchCode || matchText;
      })
      .slice(0, 250);
  }, [preferiti, tutti, query, showAll]);

  const choose = (entry: ConferimentoCerOption) => {
    onSelect(formatCerCode(entry.codice), entry.descrizione || "", entry.pericoloso);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapRef} className={overlay ? "relative overflow-visible" : "relative"} style={overlay ? overlayStyle : undefined}>
      {label && !overlay && (
        <label className="text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block">{label}</label>
      )}
      <input
        type="text"
        value={open ? query : value}
        placeholder={value ? value : placeholder}
        onFocus={() => { setQuery(""); setOpen(true); }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onChange?.(e.target.value);
        }}
        className={
          inputClassName ??
          "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        }
        style={overlay ? { width: "100%", height: "100%" } : undefined}
      />

      {open && (
        <div className="absolute left-0 z-[90] mt-1 max-h-64 w-[min(28rem,80vw)] overflow-y-auto rounded-lg border border-border bg-popover shadow-xl">
          <label className="sticky top-0 flex cursor-pointer items-center gap-2 border-b border-border/40 bg-popover px-2 py-1.5 text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="accent-emerald-500"
              onMouseDown={(e) => e.stopPropagation()}
            />
            <span>Tutti i CER europei</span>
            <span className="ml-auto font-mono">{results.length}</span>
          </label>
          {results.map((entry) => (
            <button
              key={entry.codice}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(entry)}
              className="flex w-full items-start gap-2 border-b border-border/20 px-2 py-1.5 text-left transition-colors last:border-b-0 hover:bg-accent/50"
            >
              <span className="w-16 shrink-0 font-mono text-[11px] text-foreground">{formatCerCode(entry.codice)}</span>
              <span className="min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground">{entry.descrizione || "—"}</span>
              {preferredCodes.has(normalize(entry.codice)) && <Star className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />}
              {entry.pericoloso && <span className="mt-0.5 shrink-0 text-[9px] font-bold text-red-400">P</span>}
            </button>
          ))}
          {results.length === 0 && <p className="px-2 py-4 text-center text-[11px] text-muted-foreground">Nessun CER trovato</p>}
        </div>
      )}
    </div>
  );
}
