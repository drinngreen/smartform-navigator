import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Send,
  Database,
  FileText,
  Warehouse,
  Handshake,
  Users,
  Star,
  Plus,
  X,
  Printer,
  Scissors,
} from "lucide-react";

/**
 * Pulsantiera dei preferiti della console centrale.
 * Solo scorciatoie di navigazione: non esegue operazioni e non tocca dati.
 */

export interface ScorciatoiaPreferita {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

const CHIAVE_STORAGE = "mn-dev-preferiti-v1";

export function scorciatoieDisponibili(context: string): ScorciatoiaPreferita[] {
  const base = `/mn/admin/${context}`;
  return [
    { id: "registri-cs", label: "Registri C/S", path: `${base}?tab=registri`, icon: <ClipboardList size={16} /> },
    { id: "invii-rentri", label: "Invii al RENTRI", path: `${base}/rentri-console?tab=registri`, icon: <Send size={16} /> },
    { id: "movimenti-rentri", label: "Movimenti RENTRI", path: `${base}/rentri-console?tab=registriufficiali`, icon: <Database size={16} /> },
    { id: "compila-fir", label: "Compila FIR", path: `${base}/rentri-console?tab=nuovo`, icon: <FileText size={16} /> },
    { id: "giacenze", label: "Giacenze", path: `${base}?tab=impianto&impiantoSub=giacenze`, icon: <Warehouse size={16} /> },
    { id: "cernite", label: "Cernite", path: `${base}?tab=impianto&impiantoSub=cernite`, icon: <Scissors size={16} /> },
    { id: "conferimenti-privati", label: "Conferimenti privati", path: `${base}/magazzino`, icon: <Warehouse size={16} /> },
    { id: "intermediazione", label: "Intermediazione", path: `${base}/rentri-console?tab=intermediario`, icon: <Handshake size={16} /> },
    { id: "fir-cartacei", label: "FIR cartacei", path: `${base}/rentri-console?tab=cartacei`, icon: <Printer size={16} /> },
    { id: "personale", label: "Personale", path: `${base}?tab=personale`, icon: <Users size={16} /> },
    { id: "privati", label: "Privati", path: `${base}?tab=privati`, icon: <Users size={16} /> },
  ];
}

const PREDEFINITI = ["registri-cs", "invii-rentri", "movimenti-rentri", "compila-fir", "giacenze", "cernite"];

function leggiPreferiti(): string[] {
  try {
    const raw = localStorage.getItem(CHIAVE_STORAGE);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      const conBase = [...parsed];
      for (const id of ["giacenze", "cernite"]) if (!conBase.includes(id)) conBase.push(id);
      return conBase;
    }
  } catch {
    /* preferenza non leggibile: si riparte dai predefiniti */
  }
  return PREDEFINITI;
}

export function DevPulsantieraPreferiti({ context }: { context: string }) {
  const navigate = useNavigate();
  const [ids, setIds] = useState<string[]>(leggiPreferiti);
  const [aggiungi, setAggiungi] = useState(false);

  const tutte = useMemo(() => scorciatoieDisponibili(context), [context]);
  const attive = useMemo(
    () => ids.map((id) => tutte.find((s) => s.id === id)).filter(Boolean) as ScorciatoiaPreferita[],
    [ids, tutte],
  );
  const mancanti = useMemo(() => tutte.filter((s) => !ids.includes(s.id)), [ids, tutte]);

  const salva = (next: string[]) => {
    setIds(next);
    try {
      localStorage.setItem(CHIAVE_STORAGE, JSON.stringify(next));
    } catch {
      /* spazio non disponibile: i preferiti restano validi per questa sessione */
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-border/30 bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Star size={14} className="text-amber-400" /> Preferiti
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {attive.map((s) => (
          <div key={s.id} className="group relative">
            <button
              type="button"
              onClick={() => navigate(s.path)}
              className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/50 px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              {s.icon}
              {s.label}
            </button>
            <button
              type="button"
              aria-label={`Togli ${s.label} dai preferiti`}
              onClick={() => salva(ids.filter((x) => x !== s.id))}
              className="absolute -right-1.5 -top-1.5 hidden rounded-full border border-border bg-destructive p-0.5 text-destructive-foreground group-hover:block"
            >
              <X size={11} />
            </button>
          </div>
        ))}
        {attive.length === 0 && (
          <span className="text-xs text-muted-foreground">Nessun preferito: aggiungine uno.</span>
        )}
        {mancanti.length > 0 && (
          <button
            type="button"
            onClick={() => setAggiungi((v) => !v)}
            className="flex items-center gap-1 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Plus size={14} /> Aggiungi
          </button>
        )}
      </div>

      {aggiungi && mancanti.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/30 pt-3">
          {mancanti.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                salva([...ids, s.id]);
                setAggiungi(false);
              }}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
