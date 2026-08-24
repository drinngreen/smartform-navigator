import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Check } from "lucide-react";
import { HP_CARATTERISTICHE, normalizeHpList, formatHpLabel } from "@/data/hpCaratteristiche";

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  /** Codice EER/CER selezionato: se pericoloso (voce con asterisco) le HP sono obbligatorie */
  codiceEER?: string;
  label?: string;
}

export function HpSelector({ value, onChange, codiceEER, label = "Caratteristiche di pericolo (HP)" }: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => normalizeHpList(value), [value]);
  const pericoloso = String(codiceEER || "").includes("*");
  const mancante = pericoloso && selected.length === 0;

  const toggle = (codice: string) => {
    const next = selected.includes(codice)
      ? selected.filter((c) => c !== codice)
      : normalizeHpList([...selected, codice]);
    onChange(next);
  };

  return (
    <div>
      <label className="text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block">{label}</label>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 bg-secondary/50 border rounded-lg px-3 py-2 text-left text-sm text-white ${
          mancante ? "border-destructive" : "border-border"
        }`}
      >
        <span className={selected.length ? "" : "text-white/50"}>
          {selected.length ? selected.join(", ") : "Nessuna HP selezionata"}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {mancante && (
        <p className="mt-1 flex items-start gap-1 text-[11px] text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-[1px]" />
          Il codice EER selezionato è pericoloso (voce con asterisco): indicare almeno una caratteristica HP.
        </p>
      )}

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((c) => (
            <span key={c} className="px-2 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-[11px] text-white">
              {formatHpLabel(c)}
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-secondary/60 divide-y divide-border/50">
          {HP_CARATTERISTICHE.map((hp) => {
            const isSel = selected.includes(hp.codice);
            return (
              <button
                key={hp.codice}
                type="button"
                onClick={() => toggle(hp.codice)}
                className={`w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-primary/10 ${isSel ? "bg-primary/10" : ""}`}
              >
                <span className={`mt-[2px] h-4 w-4 shrink-0 rounded border flex items-center justify-center ${isSel ? "bg-primary border-primary" : "border-border"}`}>
                  {isSel && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-white">{hp.codice} — {hp.nome}</span>
                  <span className="block text-[11px] text-white/60">{hp.significato}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-1 text-[10px] text-white/45 leading-snug">
        Le HP si riferiscono al rifiuto (All. III dir. rifiuti UE, Reg. 1357/2014 e 2017/997); le frasi H (H314, H400...) riguardano
        le sostanze contenute. L'attribuzione richiede EER, processo produttivo, schede di sicurezza ed eventuali analisi.
      </p>
    </div>
  );
}
