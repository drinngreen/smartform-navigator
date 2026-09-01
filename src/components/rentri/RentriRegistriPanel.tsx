import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Send, CheckCircle2, RefreshCw, ClipboardList } from "lucide-react";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL_TENANT_ID = "819c783e-78dd-4080-8265-802e75b0d813";

/** Registri cronologici ufficiali gestiti dalla console. */
export const REGISTRI_RENTRI = [
  { id: "MULTY_IMPIANTO", label: "Multyproget — Impianto", tenant: MULTY_TENANT_ID, registroId: "RAH20NP7O40", source: "registro" },
  { id: "MULTY_CONTO_PROPRIO", label: "Multyproget — Conto Proprio", tenant: MULTY_TENANT_ID, registroId: "RQCTGTP7NT0", source: "registro" },
  { id: "MULTY_PRIVATI", label: "Multyproget — Privati", tenant: MULTY_TENANT_ID, registroId: "RAH20NP7O40", source: "privati" },
  { id: "NIYOL", label: "Niyol", tenant: NIYOL_TENANT_ID, registroId: "RTR31497PX0", source: "registro" },
] as const;

type RegistroId = (typeof REGISTRI_RENTRI)[number]["id"];

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

export function RentriRegistriPanel() {
  const [registro, setRegistro] = useState<RegistroId>("MULTY_IMPIANTO");
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
              .order("data", { ascending: true })
              .order("numero_progressivo", { ascending: true })
          : supabase
              .from("registro_generale" as any)
              .select(
                "id, numero_interno, data_movimento, cer, descrizione, carico_scarico, tipo_operazione, numero_formulario, quantita",
              )
              .eq("tenant_id", cfg.tenant)
              .eq("registro", registro)
              .order("data_movimento", { ascending: true })
              .order("numero_interno", { ascending: true }),
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

  const { inviati, daInviare } = useMemo(() => {
    const inviati: RigaRegistro[] = [];
    const daInviare: RigaRegistro[] = [];
    (data?.movimenti ?? []).forEach((r) => {
      (esitiMap.has(Number(r.numero_interno)) ? inviati : daInviare).push(r);
    });
    return { inviati, daInviare };
  }, [data, esitiMap]);

  const toggle = (id: string) =>
    setSel((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const allSelected = daInviare.length > 0 && daInviare.every((r) => sel.has(r.id));

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
        Registro RENTRI <span className="font-mono text-foreground">{cfg.registroId}</span> — movimenti inviati e ricevute
        ufficiali, movimenti ancora da trasmettere.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento registro...</p>
      ) : (
        <>
          {/* DA INVIARE */}
          <div className="rounded-2xl border border-amber-500/30 bg-card/60 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h4 className="text-sm font-bold text-amber-300">
                Da inviare al RENTRI — {daInviare.length} movimenti
              </h4>
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSel(allSelected ? new Set() : new Set(daInviare.map((r) => r.id)))}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                >
                  {allSelected ? "Deseleziona tutti" : "Seleziona tutti"}
                </button>
                <button
                  type="button"
                  disabled={sel.size === 0}
                  onClick={() => setPopup(true)}
                  className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-black disabled:opacity-40"
                >
                  <Send size={13} /> Invia selezionati ({sel.size})
                </button>
                <button
                  type="button"
                  disabled={daInviare.length === 0}
                  onClick={() => setPopup(true)}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-40"
                >
                  <Send size={13} /> Invia tutti
                </button>
              </div>
            </div>
            <div className="max-h-[420px] overflow-auto rounded-xl border border-border/30">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-secondary/70 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2" />
                    <th className="px-3 py-2 text-left">N. Int.</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">C./S.</th>
                    <th className="px-3 py-2 text-left">CER</th>
                    <th className="px-3 py-2 text-right">Kg</th>
                    <th className="px-3 py-2 text-left">Formulario</th>
                    <th className="px-3 py-2 text-right">Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {daInviare.map((r) => (
                    <tr key={r.id} className="border-t border-border/20">
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} />
                      </td>
                      <td className="px-3 py-2 font-mono">{r.numero_interno ?? "—"}</td>
                      <td className="px-3 py-2">{r.data_movimento ?? "—"}</td>
                      <td className="px-3 py-2">{r.carico_scarico ?? "—"}</td>
                      <td className="px-3 py-2 font-mono">{r.cer ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtKg(r.quantita)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.numero_formulario ?? "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setPopup(true)}
                          className="rounded-lg border border-primary/50 px-3 py-1 text-xs font-semibold"
                        >
                          Invia
                        </button>
                      </td>
                    </tr>
                  ))}
                  {daInviare.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                        Nessun movimento da inviare.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* INVIATI */}
          <div className="rounded-2xl border border-emerald-500/30 bg-card/60 p-4 space-y-3">
            <h4 className="text-sm font-bold text-emerald-300">
              Inviati al RENTRI — {inviati.length} movimenti (ricevuta ufficiale)
            </h4>
            <div className="max-h-[460px] overflow-auto rounded-xl border border-border/30">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-secondary/70 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">N. Int.</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">CER</th>
                    <th className="px-3 py-2 text-right">Kg</th>
                    <th className="px-3 py-2 text-left">Formulario</th>
                    <th className="px-3 py-2 text-left">Progressivi RENTRI</th>
                    <th className="px-3 py-2 text-left">Identificativo RENTRI</th>
                    <th className="px-3 py-2 text-left">Transazione</th>
                    <th className="px-3 py-2 text-left">Esito</th>
                  </tr>
                </thead>
                <tbody>
                  {inviati.map((r) => {
                    const e = esitiMap.get(Number(r.numero_interno))!;
                    return (
                      <tr key={r.id} className="border-t border-border/20 bg-emerald-500/5">
                        <td className="px-3 py-2 font-mono">{r.numero_interno ?? "—"}</td>
                        <td className="px-3 py-2">{r.data_movimento ?? "—"}</td>
                        <td className="px-3 py-2 font-mono">{r.cer ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtKg(r.quantita)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{r.numero_formulario ?? "—"}</td>
                        <td className="px-3 py-2 font-mono text-xs">{(e.progressivi ?? []).join(", ")}</td>
                        <td className="px-3 py-2 font-mono text-[11px]">{(e.identificativi_rentri ?? []).join(" | ")}</td>
                        <td className="px-3 py-2 font-mono text-[11px]">{e.transazione_id ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                            <CheckCircle2 size={11} /> INVIATO
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {inviati.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                        Nessun invio registrato per questo registro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
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
