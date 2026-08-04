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
  /** Ruolo della sezione: filtra le autorizzazioni pertinenti (mostra comunque tutte) */
  ruolo?: "PRODUTTORE" | "TRASPORTATORE" | "DESTINATARIO" | "INTERMEDIARIO";
  /** Chiamato quando si sceglie l'azienda: compila denominazione, indirizzo, CF/P.IVA */
  onSelectAzienda: (data: PresetFill) => void;
  /** Chiamato quando si sceglie l'autorizzazione: numero, tipo, data */
  onSelectAutorizzazione: (aut: { numero: string; tipo: string; data: string }) => void;
  /** Opzionale: cantiere / unità locale del cliente selezionato */
  onSelectCantiere?: (c: { denominazione: string; indirizzo: string }) => void;
  /** Opzionale: targa del cliente selezionato */
  onSelectTarga?: (t: { targa: string; conducente: string }) => void;
  /** Opzionale: conducente del cliente selezionato */
  onSelectConducente?: (c: { cognome: string; nome: string }) => void;
}

const fmtIndirizzo = (r: any) =>
  [r.indirizzo, [r.cap, r.citta ?? r.comune, r.provincia ? `(${r.provincia})` : ""].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" - ");

export function PresetAziendaSelector({
  label = "Preset azienda",
  ruolo,
  onSelectAzienda,
  onSelectAutorizzazione,
  onSelectCantiere,
  onSelectTarga,
  onSelectConducente,
}: Props) {
  const [aziendaKey, setAziendaKey] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteIds, setClienteIds] = useState<string[]>([]);
  const [clienteNome, setClienteNome] = useState("");
  const [dbAuts, setDbAuts] = useState<any[]>([]);
  const [cantieri, setCantieri] = useState<any[]>([]);
  const [targhe, setTarghe] = useState<any[]>([]);
  const [conducenti, setConducenti] = useState<any[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [auts, setAuts] = useState<AutorizzazionePreset[]>([]);
  const [autId, setAutId] = useState("");
  const [adding, setAdding] = useState(false);
  const [nuovo, setNuovo] = useState({ numero: "", tipo: TIPI_AUTORIZZAZIONE[0], data: "" });
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  /** Le anagrafiche importate contengono righe duplicate per la stessa azienda
   *  (stesso CF / P.IVA su indirizzi diversi): i dati collegati (autorizzazioni,
   *  cantieri, targhe, conducenti) vanno quindi raccolti su TUTTI i duplicati. */
  const resolveClienteIds = async (r: { id: string; codice_fiscale?: string | null; partita_iva?: string | null }) => {
    const keys = [r.codice_fiscale, r.partita_iva].filter((v) => v && String(v).trim().length > 3) as string[];
    if (keys.length === 0) return [r.id];
    const filters = keys
      .flatMap((k) => [`codice_fiscale.eq.${k}`, `partita_iva.eq.${k}`])
      .join(",");
    const { data } = await supabase.from("anagrafica_aziende_mp").select("id").or(filters).limit(200);
    const ids = Array.from(new Set([r.id, ...(data || []).map((x: any) => x.id)]));
    return ids;
  };


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
        .limit(50);
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

  // Carica tutti i dati collegati (autorizzazioni, cantieri, targhe, conducenti) del cliente scelto
  useEffect(() => {
    if (!clienteId) {
      setDbAuts([]);
      setCantieri([]);
      setTarghe([]);
      setConducenti([]);
      return;
    }
    let cancelled = false;
    setLoadingDeps(true);
    (async () => {
      const [a, c, t, k] = await Promise.all([
        supabase
          .from("cliente_autorizzazioni")
          .select("id,numero_autorizzazione,tipo,ente_rilascio,data_inizio,data_scadenza,note")
          .eq("cliente_id", clienteId)
          .order("data_scadenza", { ascending: false })
          .limit(500),
        supabase
          .from("cliente_cantieri")
          .select("id,denominazione,indirizzo,comune,provincia,note")
          .eq("cliente_id", clienteId)
          .order("denominazione")
          .limit(1000),
        supabase
          .from("cliente_targhe")
          .select("id,targa,tipo_mezzo,conducente_default")
          .eq("cliente_id", clienteId)
          .order("targa")
          .limit(1000),
        supabase
          .from("cliente_conducenti")
          .select("id,cognome,nome")
          .eq("cliente_id", clienteId)
          .order("cognome")
          .limit(1000),
      ]);
      if (cancelled) return;
      setDbAuts(a.data || []);
      setCantieri(c.data || []);
      setTarghe(t.data || []);
      setConducenti(k.data || []);
      setLoadingDeps(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clienteId]);

  const selectAnagrafica = (r: any) => {
    onSelectAzienda({
      nome: r.ragione_sociale || "",
      indirizzo: fmtIndirizzo(r),
      cf: r.codice_fiscale || "",
      piva: r.partita_iva || r.codice_fiscale || "",
    });
    setClienteId(r.id);
    setClienteNome(r.ragione_sociale || "");
    setAziendaKey("");
    setAuts([]);
    setAutId("");
    setQuery(r.ragione_sociale || "");
    setResults([]);
  };

  const selectAzienda = async (key: string) => {
    setAziendaKey(key);
    setAutId("");
    setAuts(key ? getAutorizzazioni(key) : []);
    const az = AZIENDE_PRESETS.find((a) => a.key === key);
    if (!az) {
      setClienteId(null);
      setClienteNome("");
      return;
    }
    onSelectAzienda({ nome: az.nome, indirizzo: az.indirizzo, cf: az.cf, piva: az.piva });
    setClienteNome(az.nome);
    const { data } = await supabase
      .from("anagrafica_aziende_mp")
      .select("id")
      .or(`codice_fiscale.eq.${az.cf},partita_iva.eq.${az.piva}`)
      .limit(1)
      .maybeSingle();
    setClienteId(data?.id ?? null);
  };

  const selectAut = (id: string) => {
    setAutId(id);
    const local = auts.find((a) => a.id === id);
    if (local) {
      onSelectAutorizzazione({ numero: local.numero, tipo: local.tipo, data: local.data });
      return;
    }
    const db = dbAuts.find((a) => a.id === id);
    if (db) {
      onSelectAutorizzazione({
        numero: db.numero_autorizzazione || "",
        tipo: db.ente_rilascio || db.tipo || "",
        data: db.data_scadenza || db.data_inizio || "",
      });
    }
  };

  const salvaNuovo = () => {
    const key = aziendaKey || clienteId;
    if (!key || !nuovo.numero.trim()) return;
    const entry = addAutorizzazione(key, {
      numero: nuovo.numero.trim(),
      tipo: nuovo.tipo,
      data: nuovo.data,
    });
    setAuts(getAutorizzazioni(key));
    setAdding(false);
    setNuovo({ numero: "", tipo: TIPI_AUTORIZZAZIONE[0], data: "" });
    setAutId(entry.id);
    onSelectAutorizzazione({ numero: entry.numero, tipo: entry.tipo, data: entry.data });
  };

  const eliminaSelezionata = () => {
    const key = aziendaKey || clienteId;
    if (!key || !autId) return;
    removeAutorizzazione(key, autId);
    setAuts(getAutorizzazioni(key));
    setAutId("");
  };

  // autorizzazioni del ruolo prima, poi tutte le altre
  const autsOrdinate = ruolo
    ? [...dbAuts].sort((a, b) => (a.tipo === ruolo ? -1 : 0) - (b.tipo === ruolo ? -1 : 0))
    : dbAuts;

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

      {clienteId && (
        <p className="text-[10px] text-white/50">
          {loadingDeps ? "Caricamento dati collegati…" : (
            <>
              {clienteNome}: {autsOrdinate.length} autorizzazioni · {cantieri.length} cantieri · {targhe.length} targhe ·{" "}
              {conducenti.length} conducenti
            </>
          )}
        </p>
      )}

      {(aziendaKey || clienteId) && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select value={autId} onChange={(e) => selectAut(e.target.value)} className={selectCls}>
              <option value="">-- Autorizzazione (numero / tipo / scadenza) --</option>
              {autsOrdinate.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.numero_autorizzazione} — {a.tipo}
                  {a.ente_rilascio ? ` ${a.ente_rilascio}` : ""}
                  {a.data_scadenza ? ` (scad. ${a.data_scadenza})` : ""}
                </option>
              ))}
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
            {autId && auts.some((a) => a.id === autId) && (
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

          {autsOrdinate.length === 0 && auts.length === 0 && !adding && (
            <p className="text-[10px] text-white/50">
              Nessuna autorizzazione in archivio per questa azienda: usa ＋ per aggiungerla.
            </p>
          )}

          {onSelectCantiere && cantieri.length > 0 && (
            <select
              className={selectCls}
              defaultValue=""
              onChange={(e) => {
                const c = cantieri.find((x) => x.id === e.target.value);
                if (c)
                  onSelectCantiere({
                    denominazione: c.denominazione || "",
                    indirizzo: [c.indirizzo, c.comune, c.provincia ? `(${c.provincia})` : ""].filter(Boolean).join(" "),
                  });
              }}
            >
              <option value="">-- Cantiere / luogo di produzione ({cantieri.length}) --</option>
              {cantieri.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.denominazione, c.indirizzo, c.comune, c.provincia].filter(Boolean).join(" · ")}
                </option>
              ))}
            </select>
          )}

          {onSelectTarga && targhe.length > 0 && (
            <select
              className={selectCls}
              defaultValue=""
              onChange={(e) => {
                const t = targhe.find((x) => x.id === e.target.value);
                if (t) onSelectTarga({ targa: t.targa || "", conducente: t.conducente_default || "" });
              }}
            >
              <option value="">-- Targa mezzo ({targhe.length}) --</option>
              {targhe.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.targa}
                  {t.tipo_mezzo ? ` (${t.tipo_mezzo})` : ""}
                  {t.conducente_default ? ` — ${t.conducente_default}` : ""}
                </option>
              ))}
            </select>
          )}

          {onSelectConducente && conducenti.length > 0 && (
            <select
              className={selectCls}
              defaultValue=""
              onChange={(e) => {
                const c = conducenti.find((x) => x.id === e.target.value);
                if (c) onSelectConducente({ cognome: c.cognome || "", nome: c.nome || "" });
              }}
            >
              <option value="">-- Conducente ({conducenti.length}) --</option>
              {conducenti.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.cognome, c.nome].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
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
