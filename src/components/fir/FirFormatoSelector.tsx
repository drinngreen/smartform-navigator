import { AlertTriangle, FileText, Printer } from "lucide-react";

/**
 * Formato del formulario: digitale (RENTRI) oppure cartaceo.
 * Il FIR cartaceo resta ammesso, in alternativa al digitale, fino al 15 settembre 2026.
 */
export type FormatoFir = "digitale" | "cartaceo";

/** Ultimo giorno di ammissibilità del FIR cartaceo (fine giornata). */
export const FIR_CARTACEO_DEADLINE = new Date("2026-09-15T23:59:59");

export function normalizeFormatoFir(value: unknown): FormatoFir {
  return String(value ?? "").toLowerCase() === "cartaceo" ? "cartaceo" : "digitale";
}

export function giorniResiduiFirCartaceo(now: Date = new Date()): number {
  const ms = FIR_CARTACEO_DEADLINE.getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

interface FirFormatoSelectorProps {
  value: FormatoFir;
  onChange: (value: FormatoFir) => void;
  disabled?: boolean;
  className?: string;
}

export function FirFormatoSelector({ value, onChange, disabled, className }: FirFormatoSelectorProps) {
  const giorni = giorniResiduiFirCartaceo();
  const scaduto = giorni <= 0;

  return (
    <div className={`rounded-xl border border-border/50 bg-card/60 p-3 space-y-2 ${className ?? ""}`}>
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Formato formulario</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("digitale")}
          className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 font-display text-xs tracking-wider transition-colors disabled:opacity-50 ${
            value === "digitale"
              ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-200"
              : "border-border/40 bg-background/40 text-muted-foreground hover:bg-card/80"
          }`}
        >
          <FileText className="h-4 w-4" /> DIGITALE RENTRI
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("cartaceo")}
          className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 font-display text-xs tracking-wider transition-colors disabled:opacity-50 ${
            value === "cartaceo"
              ? "border-amber-500/60 bg-amber-500/20 text-amber-200"
              : "border-border/40 bg-background/40 text-muted-foreground hover:bg-card/80"
          }`}
        >
          <Printer className="h-4 w-4" /> CARTACEO
        </button>
      </div>

      {value === "cartaceo" && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] font-mono leading-relaxed ${
            scaduto
              ? "border-red-500/50 bg-red-500/10 text-red-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-200"
          }`}
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {scaduto
              ? "Il termine per l'uso del FIR cartaceo (15 settembre 2026) è scaduto: verifica la normativa prima di procedere."
              : `FIR cartaceo ammesso in alternativa al digitale fino al 15 settembre 2026 (${giorni} giorni residui). Nessun invio a RENTRI: resta disponibile la stampa PDF per l'archiviazione.`}
          </span>
        </div>
      )}
    </div>
  );
}
