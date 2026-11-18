import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, Truck, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { filtraTarghe, normalizzaTargaTesto, ordinaTarghePerCognome } from "@/lib/targaOrdinamento";

export interface SceltaConducenteTarga {
  conducente: string;
  targa: string;
  rimorchio: string;
}

type Risultato =
  | { tipo: "targa"; id: string; conducente: string; targa: string; rimorchio: string; tipoMezzo: string; azienda: string }
  | { tipo: "conducente"; id: string; conducente: string; azienda: string };

/** Legge tutte le righe di una tabella a pagine da 1000 (limite del database). */
async function leggiTutto(tabella: string, colonne: string, ordine: string) {
  const rows: any[] = [];
  for (let page = 0; page < 10; page++) {
    const { data, error } = await (supabase as any)
      .from(tabella)
      .select(colonne)
      .order(ordine)
      .range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

/**
 * Ricerca immediata di conducente e targa in tutta l'anagrafica (mezzi e autisti
 * di tutte le società del gruppo). Si scrive il cognome o la targa, i risultati
 * compaiono subito sotto e un clic compila conducente, targa e rimorchio.
 */
export function RicercaConducenteTarga({ onSelect }: { onSelect: (s: SceltaConducenteTarga) => void }) {
  const [query, setQuery] = useState("");
  const [targhe, setTarghe] = useState<any[]>([]);
  const [conducenti, setConducenti] = useState<any[]>([]);
  const [aziende, setAziende] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState("");
  const [scelto, setScelto] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, c] = await Promise.all([
          leggiTutto("cliente_targhe", "id,targa,tipo_mezzo,conducente_default,note,cliente_id", "targa"),
          leggiTutto("cliente_conducenti", "id,cognome,nome,cliente_id", "cognome"),
        ]);
        const ids = Array.from(new Set([...t, ...c].map((r) => r.cliente_id).filter(Boolean))).slice(0, 500);
        const nomi = new Map<string, string>();
        if (ids.length) {
          const { data } = await supabase.from("anagrafica_aziende_mp").select("id,ragione_sociale").in("id", ids);
          for (const a of data || []) nomi.set(a.id, a.ragione_sociale || "");
        }
        if (cancelled) return;
        setTarghe(t);
        setConducenti(c);
        setAziende(nomi);
      } catch {
        if (!cancelled) setErrore("Elenco di autisti e targhe non leggibile: riprova ricaricando la pagina.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const risultati = useMemo<Risultato[]>(() => {
    const termini = normalizzaTargaTesto(query).split(" ").filter(Boolean);
    if (termini.length === 0) return [];

    // Mezzi: stessa targa+autista una sola volta, anche se registrati sotto più società
    const visti = new Set<string>();
    const mezzi: Risultato[] = [];
    for (const t of ordinaTarghePerCognome(filtraTarghe(targhe, query))) {
      const k = `${normalizzaTargaTesto(t.targa)}|${normalizzaTargaTesto(t.conducente_default)}`;
      if (visti.has(k)) continue;
      visti.add(k);
      mezzi.push({
        tipo: "targa",
        id: t.id,
        conducente: String(t.conducente_default || "").trim(),
        targa: String(t.targa || "").trim(),
        rimorchio: t.note?.match(/RIMORCHIO(?:\s+DEFAULT)?[:\s]+([^;|]+)/i)?.[1]?.trim() || "",
        tipoMezzo: t.tipo_mezzo || "",
        azienda: aziende.get(t.cliente_id) || "",
      });
    }

    // Autisti senza un mezzo già trovato sopra
    const conMezzo = new Set(mezzi.map((m) => (m.tipo === "targa" ? normalizzaTargaTesto(m.conducente) : "")));
    const autistiVisti = new Set<string>();
    const autisti: Risultato[] = [];
    for (const c of conducenti) {
      const nome = [c.cognome, c.nome].filter(Boolean).join(" ").trim();
      const k = normalizzaTargaTesto(nome);
      if (!k || conMezzo.has(k) || autistiVisti.has(k)) continue;
      if (!termini.every((t) => k.includes(t))) continue;
      autistiVisti.add(k);
      autisti.push({ tipo: "conducente", id: c.id, conducente: nome, azienda: aziende.get(c.cliente_id) || "" });
    }
    return [...mezzi, ...autisti].slice(0, 30);
  }, [query, targhe, conducenti, aziende]);

  const scegli = (r: Risultato) => {
    if (r.tipo === "targa") {
      onSelect({ conducente: r.conducente, targa: r.targa, rimorchio: r.rimorchio });
      setScelto([r.conducente, r.targa].filter(Boolean).join(" · "));
    } else {
      onSelect({ conducente: r.conducente, targa: "", rimorchio: "" });
      setScelto(r.conducente);
    }
    setQuery("");
  };

  return (
    <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-3 space-y-2">
      <label className="text-[10px] text-pink-300 font-mono uppercase tracking-wider block">
        Cerca conducente o targa
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-pink-400/40 bg-secondary/50 px-3">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-pink-300 shrink-0" /> : <Search className="h-3.5 w-3.5 text-pink-300 shrink-0" />}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={loading ? "Caricamento autisti e mezzi…" : "Scrivi cognome, nome o targa (es. Rossi, GP359)"}
          className="w-full bg-transparent py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="shrink-0 text-[10px] text-white/50 hover:text-white">
            pulisci
          </button>
        )}
      </div>

      {errore && <p className="text-[10px] text-red-300">{errore}</p>}

      {query.trim() && !loading && (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border/40 bg-background/95">
          {risultati.map((r) => (
            <button
              key={`${r.tipo}-${r.id}`}
              type="button"
              onClick={() => scegli(r)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-pink-500/15 border-b border-border/20 last:border-b-0"
            >
              {r.tipo === "targa" ? <Truck className="h-3.5 w-3.5 text-pink-300 shrink-0" /> : <User className="h-3.5 w-3.5 text-pink-300 shrink-0" />}
              <span className="flex-1 min-w-0">
                <span className="block truncate">
                  {r.conducente || "Autista non indicato"}
                  {r.tipo === "targa" && <span className="font-mono text-pink-200"> · {r.targa}</span>}
                  {r.tipo === "targa" && r.rimorchio && <span className="text-white/50"> + rim. {r.rimorchio}</span>}
                </span>
                {(r.azienda || (r.tipo === "targa" && r.tipoMezzo)) && (
                  <span className="block truncate text-[10px] text-white/45">
                    {[r.tipo === "targa" ? r.tipoMezzo : "", r.azienda].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
            </button>
          ))}
          {risultati.length === 0 && (
            <p className="px-3 py-2 text-[10px] text-amber-300">
              Nessun autista o targa con «{query.trim()}». Prova con il solo cognome o con parte della targa.
            </p>
          )}
        </div>
      )}

      {scelto && !query && <p className="text-[10px] text-emerald-300">✓ Inserito: {scelto}</p>}
    </div>
  );
}
