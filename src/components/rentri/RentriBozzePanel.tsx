import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { emissioneFir, type RentriCliente } from "@/lib/rentriVpsApi";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";
import { FileText, Loader2, PenLine, RefreshCw, Send } from "lucide-react";

const SHARED_POOL_USER_ID = "00000000-0000-0000-0000-000000000000";

interface Props {
  cliente: RentriCliente;
  societaId: string;
  tenantId: string;
  mnContext: string;
  /** Ricarica il serbatoio numeri nella console */
  onPoolChanged?: () => void;
}

type Draft = {
  id: string;
  numero_fir: string | null;
  status: string | null;
  user_id: string | null;
  codice_eer: string | null;
  quantita: number | null;
  produttore_denominazione: string | null;
  destinatario_denominazione: string | null;
  trasportatore_denominazione: string | null;
  produttore_codice_fiscale: string | null;
  destinatario_codice_fiscale: string | null;
  trasportatore_codice_fiscale: string | null;
  trasportatore_iscrizione_albo: string | null;
  descrizione_rifiuto: string | null;
  stato_fisico: string | null;
  unita_misura: string | null;
  produttore_indirizzo: string | null;
  destinatario_indirizzo: string | null;
  created_at: string;
};

type PoolRow = {
  id: string;
  fir_number: string;
  status: string;
  user_id: string | null;
};

export function RentriBozzePanel({ cliente, societaId, tenantId, mnContext, onPoolChanged }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [pool, setPool] = useState<PoolRow[]>([]);
  const [nomeByUid, setNomeByUid] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: forms }, { data: poolRows }, { data: profs }] = await Promise.all([
        supabase
          .from("fir_forms")
          .select(
            "id, numero_fir, status, user_id, codice_eer, quantita, produttore_denominazione, destinatario_denominazione, trasportatore_denominazione, produttore_codice_fiscale, destinatario_codice_fiscale, trasportatore_codice_fiscale, trasportatore_iscrizione_albo, descrizione_rifiuto, stato_fisico, unita_misura, produttore_indirizzo, destinatario_indirizzo, created_at",
          )
          .eq("tenant_id", tenantId)
          .eq("status", "bozza")
          .eq("deleted_by_user", false)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("fir_number_pool")
          .select("id, fir_number, status, user_id")
          .eq("societa_id", societaId)
          .order("fir_number", { ascending: true })
          .limit(500),
        supabase.from("profiles").select("id, user_id, nome, cognome").limit(1000),
      ]);
      setDrafts((forms ?? []) as any);
      setPool((poolRows ?? []) as any);
      const map: Record<string, string> = {};
      for (const u of (profs ?? []) as any[]) {
        const label = [u.nome, u.cognome].filter(Boolean).join(" ").trim();
        if (!label) continue;
        if (u.user_id) map[u.user_id] = label;
        map[u.id] = map[u.id] ?? label;
      }
      setNomeByUid(map);
    } catch (e: any) {
      toast.error("Errore caricamento bozze: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, societaId]);

  /** Numeri selezionabili: liberi + già assegnati a dipendenti/ufficio */
  const opzioniNumeri = useMemo(() => {
    return pool.map((p) => {
      const assegnatoA =
        p.status !== "available" && p.user_id && p.user_id !== SHARED_POOL_USER_ID
          ? nomeByUid[p.user_id] ?? "Ufficio / admin"
          : null;
      return {
        value: p.fir_number,
        libero: !assegnatoA,
        label: assegnatoA
          ? `⚠️ ${p.fir_number} — assegnato a ${assegnatoA} (l'assegnazione verrà tolta al dipendente)`
          : `${p.fir_number} — libero`,
      };
    });
  }, [pool, nomeByUid]);

  const cambiaNumero = async (draft: Draft, numero: string) => {
    const opt = opzioniNumeri.find((o) => o.value === numero);
    const msg = opt?.libero
      ? `Assegnare il numero ${numero} a questa bozza?`
      : `Il numero ${numero} è già assegnato a un dipendente.\nProseguendo l'assegnazione verrà TOLTA al dipendente (la sua bozza sarà archiviata) e il numero passerà a questa bozza.\n\nConfermi?`;
    if (!window.confirm(msg)) return;
    setBusyId(draft.id);
    try {
      const { error } = await supabase.rpc("admin_set_fir_number" as never, {
        p_form_id: draft.id,
        p_numero_fir: numero,
      } as never);
      if (error) throw error;
      toast.success(`Numero ${numero} assegnato alla bozza`);
      await load();
      onPoolChanged?.();
    } catch (e: any) {
      toast.error("Errore assegnazione numero: " + (e?.message || ""));
    } finally {
      setBusyId(null);
    }
  };

  const inviaARentri = async (d: Draft) => {
    if (!d.numero_fir) {
      toast.error("Assegna prima un numero FIR alla bozza");
      return;
    }
    if (!window.confirm(`Inviare a RENTRI il formulario ${d.numero_fir}? L'operazione è definitiva.`)) return;
    setBusyId(d.id);
    try {
      const res = await emissioneFir(cliente, {
        numero_fir: d.numero_fir,
        produttore: {
          denominazione: d.produttore_denominazione ?? "",
          codice_fiscale: d.produttore_codice_fiscale ?? "",
          indirizzo: d.produttore_indirizzo ?? "",
        },
        destinatario: {
          denominazione: d.destinatario_denominazione ?? "",
          codice_fiscale: d.destinatario_codice_fiscale ?? "",
          indirizzo: d.destinatario_indirizzo ?? "",
        },
        trasportatore: {
          denominazione: d.trasportatore_denominazione ?? "",
          codice_fiscale: d.trasportatore_codice_fiscale ?? "",
          albo: d.trasportatore_iscrizione_albo ?? "",
        },
        rifiuto: {
          codice_eer: d.codice_eer ?? "",
          descrizione: d.descrizione_rifiuto ?? "",
          stato_fisico: d.stato_fisico ?? "",
          quantita: Number(d.quantita ?? 0),
          unita_misura: d.unita_misura ?? "kg",
        },
      });
      if (!res.success) {
        toast.error(res.userMessage ?? "Invio a RENTRI fallito");
        return;
      }
      await supabase
        .from("fir_forms")
        .update({ status: "inviato", submitted_at: new Date().toISOString() } as never)
        .eq("id", d.id);
      toast.success(`Formulario ${d.numero_fir} inviato a RENTRI`);
      await load();
      onPoolChanged?.();
    } catch (e: any) {
      toast.error("Errore invio: " + (e?.message || ""));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-base font-display tracking-wider flex items-center gap-2">
            <FileText size={16} /> Bozze formulari ({drafts.length})
          </h3>
          <button
            onClick={load}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Aggiorna
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Modifica la bozza, assegna o cambia il numero FIR pescando dai numeri scaricati da RENTRI (compresi quelli già
          assegnati ai dipendenti) e invia direttamente da qui.
        </p>

        <div className="space-y-2 max-h-[560px] overflow-auto">
          {drafts.map((d) => (
            <div key={d.id} className="rounded-lg bg-secondary/30 border border-border/30 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`font-mono text-sm font-bold ${d.numero_fir ? "text-foreground" : "text-amber-400"}`}>
                  {d.numero_fir || "SENZA NUMERO"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {d.codice_eer || "—"} · {Number(d.quantita ?? 0).toLocaleString("it-IT")} {d.unita_misura || "kg"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {d.produttore_denominazione || "—"} → {d.destinatario_denominazione || "—"}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground font-mono">
                  {new Date(d.created_at).toLocaleDateString("it-IT")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  disabled={busyId === d.id}
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    e.target.value = "";
                    if (v) void cambiaNumero(d, v);
                  }}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm min-w-[280px]"
                >
                  <option value="">{d.numero_fir ? "Cambia numero FIR…" : "Assegna numero FIR…"}</option>
                  {opzioniNumeri.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setEditing(d)}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                >
                  <PenLine size={14} /> Modifica
                </button>
                <button
                  onClick={() => inviaARentri(d)}
                  disabled={busyId === d.id}
                  className="flex items-center gap-2 rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-background disabled:opacity-40"
                >
                  {busyId === d.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Invia a RENTRI
                </button>
              </div>
            </div>
          ))}
          {drafts.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">Nessuna bozza presente per questa società.</p>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/70 p-4 overflow-auto" onClick={() => setEditing(null)}>
          <div
            className="w-full max-w-6xl rounded-xl border border-border bg-card p-4 my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Modifica bozza {editing.numero_fir || "senza numero"}</h3>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  void load();
                }}
                className="rounded border border-border bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
              >
                ✕ Chiudi
              </button>
            </div>
            <MNFIRFormComplete key={editing.id} firFormId={editing.id} tenantId={tenantId} mnContext={mnContext} />
          </div>
        </div>
      )}
    </div>
  );
}
