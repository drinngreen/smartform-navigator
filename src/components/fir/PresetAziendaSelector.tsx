import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Search, Loader2, X } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { collectMatchingRegistryIds, normalizeRegistryValue } from "@/lib/registryMatching";
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
  /** CF/P.IVA già presente nel form: precarica automaticamente i dati collegati */
  initialCf?: string;
  /** Chiamato quando si sceglie l'azienda: compila denominazione, indirizzo, CF/P.IVA */
  onSelectAzienda: (data: PresetFill) => void;
  /** Chiamato quando si sceglie l'autorizzazione: numero, tipo, data */
  onSelectAutorizzazione: (aut: { numero: string; tipo: string; data: string }) => void;
  /** Opzionale: cantiere / unità locale del cliente selezionato */
  onSelectCantiere?: (c: {
    denominazione: string;
    indirizzo: string;
    comune: string;
    provincia: string;
    cap: string;
  }) => void;
  /** Opzionale: targa del cliente selezionato */
  onSelectTarga?: (t: { targa: string; rimorchio: string; tipoMezzo: string; conducente: string }) => void;
  /** Opzionale: conducente del cliente selezionato */
  onSelectConducente?: (c: { cognome: string; nome: string }) => void;
  /** Opzionale: controparte predefinita importata da Prometeo (es. vettore tipico) */
  onSelectPartnerDefault?: (p: PresetFill & { ruolo: string }) => void;
}


const fmtIndirizzo = (r: any) =>
  [r.indirizzo, [r.cap, r.citta ?? r.comune, r.provincia ? `(${r.provincia})` : ""].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" - ");

export function PresetAziendaSelector({
  label = "Preset azienda",
  ruolo,
  initialCf,
  onSelectAzienda,

  onSelectAutorizzazione,
  onSelectCantiere,
  onSelectTarga,
  onSelectConducente,
  onSelectPartnerDefault,
}: Props) {
  const [aziendaKey, setAziendaKey] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteIds, setClienteIds] = useState<string[]>([]);
  const [clienteNome, setClienteNome] = useState("");
  const [dbAuts, setDbAuts] = useState<any[]>([]);
  const [cantieri, setCantieri] = useState<any[]>([]);
  const [targhe, setTarghe] = useState<any[]>([]);
  const [conducenti, setConducenti] = useState<any[]>([]);
  const [partnerDefaults, setPartnerDefaults] = useState<any[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [auts, setAuts] = useState<AutorizzazionePreset[]>([]);
  const [autId, setAutId] = useState("");
  const [adding, setAdding] = useState(false);
  const [nuovo, setNuovo] = useState({ numero: "", tipo: TIPI_AUTORIZZAZIONE[0], data: "" });
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [roleCompanies, setRoleCompanies] = useState<any[]>([]);
  const [loadingRoleCompanies, setLoadingRoleCompanies] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadedCf, setLoadedCf] = useState("");
  const [soloRuolo, setSoloRuolo] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const prevCfRef = useRef<string | null>(null);
  const autoAutRef = useRef<string>("");



  // Tendina con TUTTA l'anagrafica (in aggiunta alla ricerca testuale)
  useEffect(() => {
    let cancelled = false;
    setLoadingAll(true);
    (async () => {
      const rows: any[] = [];
      for (let page = 0; page < 20; page++) {
        const { data, error } = await supabase
          .from("anagrafica_aziende_mp")
          .select("id,ragione_sociale,indirizzo,citta,provincia,cap,codice_fiscale,partita_iva")
          .order("ragione_sociale")
          .range(page * 1000, page * 1000 + 999);
        if (error) break;
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      if (cancelled) return;
      // Conserva tutte le righe: i duplicati possono avere autorizzazioni,
      // cantieri o targhe collegati a ID differenti. La UI li accorpa sotto.
      setAllCompanies(rows);
      setLoadingAll(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Azzera completamente la selezione: usato dalla gomma della sezione e dalla ✕ */
  const clearSelection = (emit: boolean) => {
    setClienteId(null);
    setClienteIds([]);
    setClienteNome("");
    setAziendaKey("");
    setAutId("");
    setAuts([]);
    autoAutRef.current = "";
    setQuery("");
    setResults([]);
    setLoadedCf("");
    if (emit) {
      onSelectAzienda({ nome: "", indirizzo: "", cf: "", piva: "" });
      onSelectAutorizzazione({ numero: "", tipo: "", data: "" });
    }
  };

  // Precarica i dati collegati per l'azienda già presente nel form e reagisce
  // alla gomma della sezione (CF svuotato dall'esterno → selettore azzerato).
  useEffect(() => {
    const cf = (initialCf || "").trim();
    const prev = prevCfRef.current;
    prevCfRef.current = cf;
    if (prev !== null && prev !== "" && cf === "") {
      clearSelection(false);
      return;
    }
    if (!cf || cf.length < 5 || cf.toUpperCase() === loadedCf.toUpperCase()) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("anagrafica_aziende_mp")
        .select("id,ragione_sociale,codice_fiscale,partita_iva")
        .or(`codice_fiscale.eq.${cf},partita_iva.eq.${cf}`)
        .limit(200);
      if (cancelled) return;
      setLoadedCf(cf);
      if (!data || data.length === 0) return;
      setClienteId(data[0].id);
      setClienteNome(data[0].ragione_sociale || "");
      setClienteIds(await resolveClienteIds(data[0]));
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCf, loadedCf]);



  /** Le anagrafiche importate contengono righe duplicate per la stessa azienda
   *  (stesso CF / P.IVA o stessa ragione sociale su indirizzi diversi): i dati
   *  collegati (autorizzazioni, cantieri, targhe, conducenti) vanno quindi
   *  raccolti su TUTTI i duplicati, altrimenti mancano autorizzazioni e cantieri.
   *  Il confronto normalizzato evita che spazi, punti, slash o differenze tra
   *  CF e P.IVA separino record che appartengono alla stessa azienda. */
  const resolveClienteIds = async (r: {
    id: string;
    ragione_sociale?: string | null;
    codice_fiscale?: string | null;
    partita_iva?: string | null;
  }) => {
    const localIds = collectMatchingRegistryIds(r, allCompanies);
    if (localIds.length > 1 || allCompanies.length > 0) return localIds;
    const keys = [r.codice_fiscale, r.partita_iva].filter((v) => v && String(v).trim().length > 3) as string[];
    const filters = keys.flatMap((k) => [`codice_fiscale.eq.${k}`, `partita_iva.eq.${k}`]);
    if (filters.length === 0) return [r.id];
    const { data } = await supabase
      .from("anagrafica_aziende_mp")
      .select("id,ragione_sociale,codice_fiscale,partita_iva")
      .or(filters.join(","))
      .limit(1000);
    return collectMatchingRegistryIds(r, data || []);
  };


  // Un ruolo può risultare sia dalle autorizzazioni collegate sia dalla relativa
  // flag anagrafica. L'unione evita di perdere gli impianti storici importati
  // nell'anagrafica anche quando il file autorizzazioni non contiene una riga.
  useEffect(() => {
    if (!ruolo || ruolo === "PRODUTTORE") {
      setRoleCompanies([]);
      return;
    }
    let cancelled = false;
    setLoadingRoleCompanies(true);
    setLoadError("");
    (async () => {
      const roleColumn = ruolo === "DESTINATARIO"
        ? "destinatario"
        : ruolo === "TRASPORTATORE"
          ? "trasportatore"
          : "intermediario";
      const [{ data: links, error: linksError }, { data: flagged, error: flaggedError }] = await Promise.all([
        supabase
          .from("cliente_autorizzazioni")
          .select("cliente_id")
          .eq("tipo", ruolo)
          .limit(1000),
        supabase
          .from("anagrafica_aziende_mp")
          .select("id,ragione_sociale,indirizzo,citta,provincia,cap,codice_fiscale,partita_iva")
          .eq(roleColumn, true)
          .order("ragione_sociale")
          .limit(5000),
      ]);
      if (linksError) {
        if (!cancelled) setLoadError("Impossibile caricare i preset autorizzati");
        if (!cancelled) setLoadingRoleCompanies(false);
        return;
      }
      if (flaggedError) {
        if (!cancelled) setLoadError("Impossibile leggere i ruoli dell'anagrafica");
        if (!cancelled) setLoadingRoleCompanies(false);
        return;
      }
      const ids = Array.from(new Set((links || []).map((x: any) => x.cliente_id).filter(Boolean)));
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 150) chunks.push(ids.slice(i, i + 150));
      const responses = await Promise.all(
        chunks.map((chunk) =>
          supabase
            .from("anagrafica_aziende_mp")
            .select("id,ragione_sociale,indirizzo,citta,provincia,cap,codice_fiscale,partita_iva")
            .in("id", chunk)
            .order("ragione_sociale")
        )
      );
      if (cancelled) return;
      const failed = responses.find((response) => response.error);
      if (failed) {
        setLoadError("Impossibile leggere l'anagrafica dei preset");
        setLoadingRoleCompanies(false);
        return;
      }
      const seen = new Set<string>();
      const rows = [...(flagged || []), ...responses.flatMap((response) => response.data || [])]
        .filter((row: any) => {
          const key = `${row.codice_fiscale || row.partita_iva || row.id}|${row.ragione_sociale || ""}`.toUpperCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a: any, b: any) => String(a.ragione_sociale || "").localeCompare(String(b.ragione_sociale || ""), "it"));
      setRoleCompanies(rows);
      setLoadingRoleCompanies(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ruolo]);


  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("anagrafica_aziende_mp")
        .select("id,ragione_sociale,indirizzo,citta,provincia,cap,codice_fiscale,partita_iva")
        .or(`ragione_sociale.ilike.%${q}%,codice_fiscale.ilike.%${q}%,partita_iva.ilike.%${q}%`)
        .order("ragione_sociale")
        .limit(50);
      if (!cancelled) {
        setResults(data || []);
        setLoadError(error ? "Ricerca anagrafica non disponibile" : "");
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
    const ids = (clienteIds.length ? clienteIds : clienteId ? [clienteId] : []).slice(0, 300);
    if (ids.length === 0) {
      setDbAuts([]);
      setCantieri([]);
      setTarghe([]);
      setConducenti([]);
      setPartnerDefaults([]);
      return;
    }
    let cancelled = false;
    setLoadingDeps(true);
    (async () => {
      const [a, c, t, k, p] = await Promise.all([
        supabase
          .from("cliente_autorizzazioni")
          .select("id,numero_autorizzazione,tipo,ente_rilascio,data_inizio,data_scadenza,note")
          .in("cliente_id", ids)
          .order("data_scadenza", { ascending: false })
          .limit(500),
        supabase
          .from("cliente_cantieri")
          .select("id,denominazione,indirizzo,comune,provincia,note")
          .in("cliente_id", ids)
          .order("denominazione")
          .limit(1000),
        supabase
          .from("cliente_targhe")
          .select("id,targa,tipo_mezzo,conducente_default,note")
          .in("cliente_id", ids)
          .order("targa")
          .limit(1000),
        supabase
          .from("cliente_conducenti")
          .select("id,cognome,nome")
          .in("cliente_id", ids)
          .order("cognome")
          .limit(1000),
        supabase
          .from("cliente_partner_default")
          .select("id,ruolo,ragione_sociale,indirizzo,cap,citta,provincia")
          .in("cliente_id", ids)
          .order("ruolo")
          .limit(500),
      ]);
      if (cancelled) return;
      const failed = [a, c, t, k, p].find((response) => response.error);
      if (failed) setLoadError("Alcuni dati collegati non sono leggibili");
      const dedup = (rows: any[] | null, keyFn: (r: any) => string) => {
        const seen = new Set<string>();
        return (rows || []).filter((r) => {
          const k = keyFn(r);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      };
      // Non deduplicare le autorizzazioni: righe con lo stesso numero possono
      // avere date/validità differenti e devono restare tutte selezionabili.
      setDbAuts(a.data || []);
      setCantieri(dedup(c.data, (r) => `${r.denominazione}|${r.indirizzo}|${r.comune}`));
      setTarghe(dedup(t.data, (r) => String(r.targa || "").toUpperCase()));
      setConducenti(dedup(k.data, (r) => `${r.cognome}|${r.nome}`.toUpperCase()));
      setPartnerDefaults(dedup(p.data, (r) => `${r.ruolo}|${r.ragione_sociale}|${r.indirizzo}`.toUpperCase()));
      setLoadingDeps(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clienteId, clienteIds]);

  const selectAnagrafica = async (r: any) => {
    // I dati autorizzativi appartengono esclusivamente all'azienda selezionata:
    // azzerarli prima del nuovo caricamento impedisce che restino quelli della
    // selezione precedente mentre la query asincrona è in corso.
    onSelectAutorizzazione({ numero: "", tipo: "", data: "" });
    setDbAuts([]);
    setLoadingDeps(true);
    const piva = r.partita_iva || r.codice_fiscale || "";
    onSelectAzienda({
      nome: r.ragione_sociale || "",
      indirizzo: fmtIndirizzo(r),
      cf: r.codice_fiscale || "",
      piva,
    });
    setClienteId(r.id);
    setClienteNome(r.ragione_sociale || "");
    setAziendaKey("");
    setAuts([]);
    setAutId("");
    autoAutRef.current = "";
    setQuery("");
    setResults([]);
    setPickerOpen(false);
    // evita che l'effetto su initialCf ricarichi/sovrascriva la scelta appena fatta
    setLoadedCf(piva || r.codice_fiscale || "");
    prevCfRef.current = piva || r.codice_fiscale || "";
    setClienteIds(await resolveClienteIds(r));
  };

  const selectAzienda = async (key: string) => {
    onSelectAutorizzazione({ numero: "", tipo: "", data: "" });
    setDbAuts([]);
    setLoadingDeps(true);
    setAziendaKey(key);
    setAutId("");
    setAuts(key ? getAutorizzazioni(key) : []);
    const az = AZIENDE_PRESETS.find((a) => a.key === key);
    if (!az) {
      setClienteId(null);
      setClienteIds([]);
      setClienteNome("");
      return;
    }
    onSelectAzienda({ nome: az.nome, indirizzo: az.indirizzo, cf: az.cf, piva: az.piva });
    setClienteNome(az.nome);
    setLoadedCf(az.piva || az.cf);
    prevCfRef.current = az.piva || az.cf;
    const { data } = await supabase
      .from("anagrafica_aziende_mp")
      .select("id,ragione_sociale,codice_fiscale,partita_iva")
      .or(`codice_fiscale.eq.${az.cf},partita_iva.eq.${az.piva}`)
      .limit(200);
    const first = (data || [])[0];
    setClienteId(first?.id ?? null);
    setClienteIds(first ? await resolveClienteIds(first) : []);
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
        // in formulario si riporta la data di rilascio dell'autorizzazione
        data: db.data_inizio || db.data_scadenza || "",
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

  // Il produttore può avere propri estremi autorizzativi. Mostriamo solo record
  // realmente collegati all'azienda scelta: quelli marcati PRODUTTORE e quelli
  // importati con una tipologia normativa, mai autorizzazioni di altri ruoli.
  const autsOrdinate = !ruolo
    ? dbAuts
    : ruolo === "PRODUTTORE"
      ? dbAuts.filter((a) => !["DESTINATARIO", "TRASPORTATORE", "INTERMEDIARIO"].includes(String(a.tipo || "").toUpperCase()))
      : dbAuts.filter((a) => String(a.tipo || "").toUpperCase() === ruolo);

  // Autocompilazione: appena l'azienda è scelta, applica automaticamente
  // l'autorizzazione pertinente (numero + data) senza ulteriori click.
  useEffect(() => {
    if (loadingDeps) return;
    const best = [...autsOrdinate].sort((a, b) =>
      String(b.data_scadenza || "").localeCompare(String(a.data_scadenza || ""))
    )[0];
    if (!best) return;
    const key = `${clienteId || ""}|${best.id}`;
    if (autoAutRef.current === key || autId) return;
    autoAutRef.current = key;
    setAutId(best.id);
    onSelectAutorizzazione({
      numero: best.numero_autorizzazione || "",
      tipo: best.ente_rilascio || best.tipo || "",
      data: best.data_inizio || best.data_scadenza || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbAuts, loadingDeps, ruolo, clienteId]);


  const selectCls =
    "w-full bg-secondary/50 border border-primary/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary";

  const q = query.trim().toUpperCase();
  const usaSoloRuolo = Boolean(ruolo && ruolo !== "PRODUTTORE" && soloRuolo && roleCompanies.length);
  const opzioni = useMemo(() => {
    const base = usaSoloRuolo ? roleCompanies : allCompanies;
    const match = (r: any) =>
      !q ||
      `${r.ragione_sociale || ""} ${r.codice_fiscale || ""} ${r.partita_iva || ""} ${r.citta || ""}`
        .toUpperCase()
        .includes(q);
    const byCompany = new Map<string, any>();
    const add = (r: any) => {
      if (!match(r)) return;
      const identifier = normalizeRegistryValue(r.codice_fiscale || r.partita_iva);
      const key = identifier || normalizeRegistryValue(r.ragione_sociale) || r.id;
      if (!byCompany.has(key)) byCompany.set(key, r);
    };
    for (const r of base) add(r);
    for (const r of results) add(r);
    return Array.from(byCompany.values());
  }, [usaSoloRuolo, roleCompanies, allCompanies, results, q]);

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-2">
      <label className="text-[10px] text-primary font-mono uppercase tracking-wider block">⚙ {label}</label>

      {clienteNome ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-2">
          <span className="flex-1 truncate text-sm text-white" title={clienteNome}>
            {clienteNome}
          </span>
          <button
            type="button"
            onClick={() => clearSelection(true)}
            title="Cambia azienda (azzera i campi)"
            className="shrink-0 flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] text-red-200 hover:bg-red-500/20"
          >
            <X className="h-3 w-3" /> Cambia
          </button>
        </div>
      ) : (
        <select value={aziendaKey} onChange={(e) => selectAzienda(e.target.value)} className={selectCls}>
          <option value="">-- Preset Multyproget / Niyol --</option>
          {AZIENDE_PRESETS.map((a) => (
            <option key={a.key} value={a.key}>{a.nome}</option>
          ))}
        </select>
      )}

      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-secondary/50 px-3">
          <Search className="h-3.5 w-3.5 text-primary shrink-0" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPickerOpen(true);
            }}
            onFocus={() => setPickerOpen(true)}
            placeholder={
              loadingAll
                ? "Caricamento anagrafica…"
                : `Cerca o scorri ${usaSoloRuolo ? roleCompanies.length : allCompanies.length} aziende (nome, P.IVA, CF)…`
            }
            className="w-full bg-transparent py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
          {(searching || loadingAll) && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />}
          {pickerOpen && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setPickerOpen(false)}
              className="shrink-0 text-[10px] text-white/50 hover:text-white"
            >
              chiudi
            </button>
          )}
        </div>

        {ruolo && ruolo !== "PRODUTTORE" && roleCompanies.length > 0 && (
          <label className="mt-1 flex items-center gap-2 text-[10px] text-white/60">
            <input type="checkbox" checked={soloRuolo} onChange={(e) => setSoloRuolo(e.target.checked)} />
            Solo aziende con autorizzazione {ruolo.toLowerCase()} ({roleCompanies.length})
            {loadingRoleCompanies && " — caricamento…"}
          </label>
        )}

        {pickerOpen && (
          <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-primary/30 bg-background shadow-xl">
            {opzioni.slice(0, 100).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  void selectAnagrafica(r);
                }}
                className="block w-full px-3 py-2 text-left text-xs text-white hover:bg-primary/15"
              >
                <span className="font-semibold">{r.ragione_sociale}</span>
                <span className="block text-[10px] text-white/50">
                  {[r.indirizzo, r.citta, r.partita_iva || r.codice_fiscale].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))}
            {opzioni.length > 100 && (
              <p className="px-3 py-2 text-[10px] text-white/40">
                Altre {opzioni.length - 100} aziende: affina la ricerca.
              </p>
            )}
            {opzioni.length === 0 && !searching && !loadingAll && (
              <p className="px-3 py-2 text-[10px] text-white/50">Nessuna azienda trovata in anagrafica.</p>
            )}
          </div>
        )}
      </div>


      {loadError && <p className="text-[10px] text-destructive">{loadError}</p>}

      {clienteId && (
        <p className="text-[10px] text-white/50">
          {loadingDeps ? "Caricamento dati collegati…" : (
            <>
              {clienteNome}: {autsOrdinate.length} autorizzazioni · {cantieri.length} cantieri · {targhe.length} targhe ·{" "}
              {conducenti.length} conducenti · {partnerDefaults.length} dati predefiniti
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
              Nei file importati non risulta alcun numero di autorizzazione per questo ruolo: usa ＋ per aggiungerlo.
            </p>
          )}

          {onSelectCantiere && (
            <select
              className={selectCls}
              defaultValue=""
              onChange={(e) => {
                const c = cantieri.find((x) => x.id === e.target.value);
                if (c)
                  onSelectCantiere({
                    denominazione: c.denominazione || "",
                    indirizzo: c.indirizzo || "",
                    comune: c.comune || "",
                    provincia: c.provincia || "",
                    cap: c.note?.match(/(?:^|\s)CAP[:\s]+([0-9]{5})(?:\s|$)/i)?.[1] || "",
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

          {onSelectTarga && (
            <select
              className={selectCls}
              defaultValue=""
              onChange={(e) => {
                const t = targhe.find((x) => x.id === e.target.value);
                if (t) onSelectTarga({
                  targa: t.targa || "",
                  rimorchio: t.note?.match(/RIMORCHIO(?:\s+DEFAULT)?[:\s]+([^;|]+)/i)?.[1]?.trim() || "",
                  tipoMezzo: t.tipo_mezzo || "",
                  conducente: t.conducente_default || "",
                });
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

          {onSelectConducente && (
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

          {onSelectPartnerDefault && partnerDefaults.length > 0 && (
            <select
              className={selectCls}
              defaultValue=""
              onChange={(e) => {
                const p = partnerDefaults.find((x) => x.id === e.target.value);
                if (!p) return;
                onSelectPartnerDefault({
                  nome: p.ragione_sociale || "",
                  indirizzo: [p.indirizzo, p.cap, p.citta, p.provincia ? `(${p.provincia})` : ""].filter(Boolean).join(" "),
                  cf: "",
                  piva: "",
                  ruolo: p.ruolo || "",
                });
              }}
            >
              <option value="">-- Dati vettore / partner predefinito ({partnerDefaults.length}) --</option>
              {partnerDefaults.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ruolo} — {p.ragione_sociale} — {[p.indirizzo, p.citta].filter(Boolean).join(" · ")}
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
