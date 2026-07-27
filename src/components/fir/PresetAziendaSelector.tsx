import { useEffect, useState } from "react";
import { Plus, Trash2, Search, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  AZIENDE_PRESETS,
  TIPI_AUTORIZZAZIONE,
  getAutorizzazioni,
  addAutorizzazione,
  removeAutorizzazione,
  type AutorizzazionePreset,
} from "@/data/multyPresets";

export interface PresetFill {
  nome: string;
  indirizzo: string;
  cf: string;
  piva: string;
}

interface Props {
  label?: string;
  /** Chiamato quando si sceglie l'azienda: compila denominazione, indirizzo, CF/P.IVA */
  onSelectAzienda: (data: PresetFill) => void;
  /** Chiamato quando si sceglie l'autorizzazione: numero, tipo, data */
  onSelectAutorizzazione: (aut: { numero: string; tipo: string; data: string }) => void;
}

export function PresetAziendaSelector({ label = "Preset azienda", onSelectAzienda, onSelectAutorizzazione }: Props) {
  const [aziendaKey, setAziendaKey] = useState("");
  const [auts, setAuts] = useState<AutorizzazionePreset[]>([]);
  const [autId, setAutId] = useState("");
  const [adding, setAdding] = useState(false);
  const [nuovo, setNuovo] = useState({ numero: "", tipo: TIPI_AUTORIZZAZIONE[0], data: "" });
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("anagrafica_aziende_mp")
        .select("id,ragione_sociale,indirizzo,citta,provincia,cap,codice_fiscale,partita_iva")
        .or(`ragione_sociale.ilike.%${q}%,codice_fiscale.ilike.%${q}%,partita_iva.ilike.%${q}%`)
        .order("ragione_sociale")
        .limit(25);
      if (!cancelled) {
        setResults(data || []);
        setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const selectAnagrafica = (r: any) => {
    const indirizzo = [r.indirizzo, [r.cap, r.citta, r.provincia ? `(${r.provincia})` : ""].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(" - ");
    onSelectAzienda({
      nome: r.ragione_sociale || "",
      indirizzo,
      cf: r.codice_fiscale || "",
      piva: r.partita_iva || r.codice_fiscale || "",
    });
    setQuery(r.ragione_sociale || "");
    setResults([]);
  };

  const selectAzienda = (key: string) => {
    setAziendaKey(key);
    setAutId("");
    setAuts(key ? getAutorizzazioni(key) : []);
    const az = AZIENDE_PRESETS.find((a) => a.key === key);
    if (az) onSelectAzienda({ nome: az.nome, indirizzo: az.indirizzo, cf: az.cf, piva: az.piva });
  };


  const selectAut = (id: string) => {
    setAutId(id);
    const aut = auts.find((a) => a.id === id);
    if (aut) onSelectAutorizzazione({ numero: aut.numero, tipo: aut.tipo, data: aut.data });
  };

  const salvaNuovo = () => {
    if (!aziendaKey || !nuovo.numero.trim()) return;
    const entry = addAutorizzazione(aziendaKey, {
      numero: nuovo.numero.trim(),
      tipo: nuovo.tipo,
      data: nuovo.data,
    });
    setAuts(getAutorizzazioni(aziendaKey));
    setAdding(false);
    setNuovo({ numero: "", tipo: TIPI_AUTORIZZAZIONE[0], data: "" });
    setAutId(entry.id);
    onSelectAutorizzazione({ numero: entry.numero, tipo: entry.tipo, data: entry.data });
  };

  const eliminaSelezionata = () => {
    if (!aziendaKey || !autId) return;
    removeAutorizzazione(aziendaKey, autId);
    setAuts(getAutorizzazioni(aziendaKey));
    setAutId("");
  };

  const selectCls =
    "w-full bg-secondary/50 border border-primary/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-2">
      <label className="text-[10px] text-primary font-mono uppercase tracking-wider block">⚙ {label}</label>

      <select value={aziendaKey} onChange={(e) => selectAzienda(e.target.value)} className={selectCls}>
        <option value="">-- Seleziona azienda (compila indirizzo, CF/P.IVA) --</option>
        {AZIENDE_PRESETS.map((a) => (
          <option key={a.key} value={a.key}>{a.nome}</option>
        ))}
      </select>

      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-secondary/50 px-3">
          <Search className="h-3.5 w-3.5 text-primary shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca in anagrafica (es. ITALCONCIMI, P.IVA, CF)…"
            className="w-full bg-transparent py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
          {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />}
        </div>
        {results.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-primary/30 bg-background shadow-xl">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectAnagrafica(r)}
                className="block w-full px-3 py-2 text-left text-xs text-white hover:bg-primary/15"
              >
                <span className="font-semibold">{r.ragione_sociale}</span>
                <span className="block text-[10px] text-white/50">
                  {[r.indirizzo, r.citta, r.partita_iva || r.codice_fiscale].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))}
          </div>
        )}
        {query.trim().length >= 2 && !searching && results.length === 0 && (
          <p className="mt-1 text-[10px] text-white/50">Nessuna azienda trovata in anagrafica.</p>
        )}
      </div>



      {aziendaKey && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select value={autId} onChange={(e) => selectAut(e.target.value)} className={selectCls}>
              <option value="">-- Autorizzazione (numero / tipo / data) --</option>
              {auts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.numero} — {a.tipo}{a.data ? ` (${a.data})` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              title="Aggiungi autorizzazione ai preset"
              className="shrink-0 px-2 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
            {autId && (
              <button
                type="button"
                onClick={eliminaSelezionata}
                title="Rimuovi dai preset"
                className="shrink-0 px-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {auts.length === 0 && !adding && (
            <p className="text-[10px] text-white/50">
              Nessuna autorizzazione salvata: usa ＋ per aggiungere i codici di autorizzazione.
            </p>
          )}

          {adding && (
            <div className="space-y-2 rounded-lg border border-border/40 bg-background/40 p-2">
              <input
                value={nuovo.numero}
                onChange={(e) => setNuovo({ ...nuovo, numero: e.target.value })}
                placeholder="Numero / codice autorizzazione"
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={nuovo.tipo}
                  onChange={(e) => setNuovo({ ...nuovo, tipo: e.target.value })}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm"
                >
                  {TIPI_AUTORIZZAZIONE.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={nuovo.data}
                  onChange={(e) => setNuovo({ ...nuovo, data: e.target.value })}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <button
                type="button"
                onClick={salvaNuovo}
                className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-display"
              >
                Salva autorizzazione nei preset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
