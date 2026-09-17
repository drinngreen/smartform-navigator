import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Send, CheckCircle2, RefreshCw, ClipboardList, Clock } from "lucide-react";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL_TENANT_ID = "819c783e-78dd-4080-8265-802e75b0d813";

/** Registri cronologici ufficiali gestiti dalla console. */
export const REGISTRI_RENTRI = [
  { id: "MULTY_IMPIANTO", label: "Multyproget — Impianto", tenant: MULTY_TENANT_ID, registroId: "RAH20NP7O40", source: "registro" },
  { id: "MULTY_CONTO_PROPRIO", label: "Multyproget — Conto Proprio", tenant: MULTY_TENANT_ID, registroId: "RQCTGTP7NT0", source: "registro" },
  { id: "MULTY_PRIVATI", label: "Multyproget — Privati", tenant: MULTY_TENANT_ID, registroId: "RAH20NP7O40", source: "privati" },
  { id: "MULTY_INTERMEDIARIO", label: "Multyproget — Intermediazione", tenant: MULTY_TENANT_ID, registroId: "RQEL39R7NS0", source: "intermediario" },
  { id: "NIYOL", label: "Niyol", tenant: NIYOL_TENANT_ID, registroId: "RTR31497PX0", source: "registro" },
] as const;

type RegistroId = (typeof REGISTRI_RENTRI)[number]["id"];
type Filtro = "tutti" | "da_inviare" | "inviati";

interface RigaRegistro {
  id: string;
  numero_interno: number | null;
  data_movimento: string | null;
  cer: string | null;
  descrizione: string | null;
  carico_scarico: string | null;
  tipo_operazione: string | null;
  numero_formulario: string | null;
  quantita: number | null;
}

interface EsitoRow {
  numero_interno: number;
  progressivi: string[];
  identificativi_rentri: string[];
  transazione_id: string | null;
  esito: string;
  registro_label: string;
}

const fmtKg = (v: number | null | undefined) => Number(v ?? 0).toLocaleString("it-IT");
const fmtData = (d: string | null | undefined) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("it-IT") : "—";

export function RentriRegistriPanel() {
  const [registro, setRegistro] = useState<RegistroId>("MULTY_IMPIANTO");
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [popup, setPopup] = useState(false);

  const cfg = REGISTRI_RENTRI.find((r) => r.id === registro)!;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["rentri-registri-panel", registro],
    queryFn: async () => {
      const [movRes, esitiRes] = await Promise.all([
        cfg.source === "privati"
          ? supabase
              .from("privati_conferimenti" as any)
              .select("id, numero_progressivo, data, cer, kg_pesati, nome_privato")
              .eq("tenant_id", cfg.tenant)
              .order("data", { ascending: false })
              .order("numero_progressivo", { ascending: false })
          : cfg.source === "intermediario"
          ? supabase
              .from("movimenti_intermediario" as any)
              .select(
                "id, data_movimento, cer, descrizione_rifiuto, quantita_kg, numero_fir, tipo_movimento, produttore_denominazione, destinatario_denominazione",
              )
              .eq("tenant_id", cfg.tenant)
              .order("data_movimento", { ascending: false })
              .limit(2000)
          : supabase
              .from("registro_generale" as any)
              .select(
                "id, numero_interno, data_movimento, cer, descrizione, carico_scarico, tipo_operazione, numero_formulario, quantita",
              )
              .eq("tenant_id", cfg.tenant)
              .eq("registro", registro)
              .order("data_movimento", { ascending: false })
              .order("numero_interno", { ascending: false }),
        supabase
          .from("rentri_registro_esiti" as any)
          .select("numero_interno, progressivi, identificativi_rentri, transazione_id, esito, registro_label")
          .eq("registro_label", registro),
      ]);
      if (movRes.error) throw movRes.error;
      if (esitiRes.error) throw esitiRes.error;
      const movimenti: RigaRegistro[] =
        cfg.source === "privati"
          ? (movRes.data ?? []).map((r: any) => ({
              id: r.id,
              numero_interno: r.numero_progressivo,
              data_movimento: r.data,
              cer: r.cer,
              descrizione: r.nome_privato,
              carico_scarico: "CARICO",
              tipo_operazione: null,
              numero_formulario: null,
              quantita: r.kg_pesati,
            }))
          : ((movRes.data ?? []) as unknown as RigaRegistro[]);
      return {
        movimenti,
        esiti: (esitiRes.data ?? []) as unknown as EsitoRow[],
      };
    },
  });

  const esitiMap = useMemo(() => {
    const m = new Map<number, EsitoRow>();
    (data?.esiti ?? []).forEach((e) => m.set(Number(e.numero_interno), e));
    return m;
  }, [data]);

  /** Tutti i movimenti in ordine cronologico inverso (più recente in alto). */
  const righe = useMemo(() => {
    const list = [...(data?.movimenti ?? [])];
    list.sort((a, b) => {
      const da = a.data_movimento ?? "";
      const db = b.data_movimento ?? "";
      if (da !== db) return db.localeCompare(da);
      return Number(b.numero_interno ?? 0) - Number(a.numero_interno ?? 0);
    });
    return list.map((r) => ({ riga: r, esito: esitiMap.get(Number(r.numero_interno)) ?? null }));
  }, [data, esitiMap]);

  const inviati = useMemo(() => righe.filter((x) => x.esito), [righe]);
  const daInviare = useMemo(() => righe.filter((x) => !x.esito), [righe]);

  const visibili = useMemo(() => {
    if (filtro === "inviati") return inviati;
    if (filtro === "da_inviare") return daInviare;
    return righe;
  }, [filtro, righe, inviati, daInviare]);

  const ultimoInvio = useMemo(() => {
    const date = inviati.map((x) => x.riga.data_movimento ?? "").filter(Boolean).sort();
    return date.length ? date[date.length - 1] : null;
  }, [inviati]);

  const toggle = (id: string) =>
    setSel((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const daInviareVisibili = visibili.filter((x) => !x.esito);
  const allSelected = daInviareVisibili.length > 0 && daInviareVisibili.every((x) => sel.has(x.riga.id));

  const FILTRI: { key: Filtro; label: string; count: number }[] = [
    { key: "tutti", label: "Tutti", count: righe.length },
    { key: "da_inviare", label: "Da inviare", count: daInviare.length },
    { key: "inviati", label: "Inviati", count: inviati.length },
  ];

  return (
    <div className="space-y-4">
      {/* Selettore registro */}
      <div className="flex flex-wrap items-center gap-2">
        {REGISTRI_RENTRI.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setRegistro(r.id);
              setSel(new Set());
            }}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
              registro === r.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
            }`}
          >
            <ClipboardList size={14} />
            {r.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void refetch()}
          className="ml-auto flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold hover:bg-secondary/70"
        >
          {isFetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Aggiorna
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Registro RENTRI <span className="font-mono text-foreground">{cfg.registroId}</span> — elenco cronologico dal
        movimento più recente al più vecchio, con lo stato di trasmissione di ogni riga.
        {ultimoInvio && (
          <>
            {" "}Ultimo movimento con ricevuta RENTRI: <strong className="text-foreground">{fmtData(ultimoInvio)}</strong>.
          </>
        )}
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento registro...</p>
      ) : (
        <div className="rounded-2xl border border-border/30 bg-card/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {FILTRI.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltro(f.key)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                  filtro === f.key
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/50 bg-secondary/40 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                disabled={daInviareVisibili.length === 0}
                onClick={() =>
                  setSel(allSelected ? new Set() : new Set(daInviareVisibili.map((x) => x.riga.id)))
                }
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                {allSelected ? "Deseleziona tutti" : "Seleziona da inviare"}
              </button>
              <button
                type="button"
                disabled={sel.size === 0}
                onClick={() => setPopup(true)}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-black disabled:opacity-40"
              >
                <Send size={13} /> Invia selezionati ({sel.size})
              </button>
            </div>
          </div>

          <div className="max-h-[620px] overflow-auto rounded-xl border border-border/30">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary/80 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2" />
                  <th className="px-3 py-2 text-left">Stato</th>
                  <th className="px-3 py-2 text-left">N. Int.</th>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">C./S.</th>
                  <th className="px-3 py-2 text-left">CER</th>
                  <th className="px-3 py-2 text-right">Kg</th>
                  <th className="px-3 py-2 text-left">Formulario</th>
                  <th className="px-3 py-2 text-left">Progressivo RENTRI</th>
                  <th className="px-3 py-2 text-left">Identificativo</th>
                </tr>
              </thead>
              <tbody>
                {visibili.map(({ riga: r, esito: e }) => (
                  <tr
                    key={r.id}
                    className={`border-t border-border/20 ${e ? "bg-emerald-500/5" : "bg-amber-500/5"}`}
                  >
                    <td className="px-3 py-2">
                      {!e && (
                        <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {e ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                          <CheckCircle2 size={11} /> INVIATO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                          <Clock size={11} /> DA INVIARE
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono">{r.numero_interno ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtData(r.data_movimento)}</td>
                    <td className="px-3 py-2">{r.carico_scarico ?? "—"}</td>
                    <td className="px-3 py-2 font-mono">{r.cer ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtKg(r.quantita)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.numero_formulario ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{(e?.progressivi ?? []).join(", ") || "—"}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {(e?.identificativi_rentri ?? []).join(" | ") || "—"}
                    </td>
                  </tr>
                ))}
                {visibili.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">
                      Nessun movimento in questa vista.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {popup && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPopup(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-card p-6 text-center space-y-4"
            onClick={(ev) => ev.stopPropagation()}
          >
            <Send className="mx-auto text-amber-400" size={28} />
            <p className="text-lg font-bold">Fare il primo invio con Riccardo</p>
            <p className="text-sm text-muted-foreground">Pulsante invio registro da settare con Riccardo.</p>
            <button
              type="button"
              onClick={() => setPopup(false)}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              Ho capito
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
