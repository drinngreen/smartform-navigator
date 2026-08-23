import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { CloudOff, RefreshCw, Send } from "lucide-react";
import { inviaFirmaRentri } from "@/services/rentriApi";
import { isRentriConnectivityError } from "@/lib/rentriVpsApi";

interface PendingFir {
  id: string;
  numero_fir: string | null;
  produttore_denominazione: string | null;
  destinatario_denominazione: string | null;
  form_data: Record<string, unknown> | null;
  since: string | null;
}

interface RentriRetryQueueProps {
  /** "multy" | "niyol": società usata per l'invio al proxy RENTRI. */
  societaId: string;
}

/**
 * Coda dei FIR rimasti in bozza perché i servizi RENTRI erano indisponibili.
 * Nessun job automatico: l'operatore rilancia l'invio quando il servizio torna su.
 */
export function RentriRetryQueue({ societaId }: RentriRetryQueueProps) {
  const [rows, setRows] = useState<PendingFir[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fir_forms")
        .select("id,numero_fir,produttore_denominazione,destinatario_denominazione,form_data,status,deleted_by_user")
        .eq("status", "bozza")
        .eq("deleted_by_user", false)
        .contains("form_data", { rentri_retry_pending: true })
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setRows(
        (data ?? []).map((r: any) => ({
          id: r.id,
          numero_fir: r.numero_fir,
          produttore_denominazione: r.produttore_denominazione,
          destinatario_denominazione: r.destinatario_denominazione,
          form_data: r.form_data ?? null,
          since: (r.form_data?.rentri_retry_since as string) ?? null,
        })),
      );
    } catch (e: any) {
      console.warn("[RENTRI] coda reinvio non caricata:", e?.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const retryOne = async (row: PendingFir): Promise<boolean> => {
    const payload = { ...(row.form_data ?? {}), numero_fir: row.numero_fir };
    const result = await inviaFirmaRentri({ societaId, payloadFir: payload });
    const numero = String(result.numero_fir || row.numero_fir || "").trim();
    await supabase
      .from("fir_forms")
      .update({
        status: "inviato",
        submitted_at: new Date().toISOString(),
        form_data: { ...(row.form_data ?? {}), rentri_retry_pending: false, rentri_retry_since: null, rentri_fir_id: result.firId ?? null },
      } as never)
      .eq("id", row.id);
    toast.success(`FIR ${numero || row.id.slice(0, 8)} inviato a RENTRI`);
    return true;
  };

  const retryAll = async () => {
    if (rows.length === 0) return;
    setSending(true);
    let ok = 0;
    for (const row of rows) {
      try {
        await retryOne(row);
        ok += 1;
      } catch (e: any) {
        if (isRentriConnectivityError(e?.message ?? "")) {
          toast.error("RENTRI ancora non raggiungibile: reinvio interrotto");
          break;
        }
        toast.error(`FIR ${row.numero_fir || row.id.slice(0, 8)}: ${e?.message ?? "errore"}`);
      }
    }
    setSending(false);
    if (ok > 0) toast.success(`${ok} formulari reinviati`);
    await load();
  };

  if (!loading && rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CloudOff className="h-4 w-4 text-amber-400" />
          <h3 className="font-semibold text-sm text-amber-200">
            In attesa di reinvio a RENTRI {rows.length > 0 && `(${rows.length})`}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Ricarica
          </button>
          <button
            type="button"
            onClick={() => void retryAll()}
            disabled={sending || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> {sending ? "Reinvio in corso..." : "Reinvia tutti"}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Formulari rimasti in bozza perché i servizi RENTRI risultavano indisponibili. Restano validi e completi: al ripristino del
        servizio vengono reinviati in blocco.
      </p>

      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 bg-card/50 px-3 py-2 text-xs">
            <span className="font-mono font-semibold">{row.numero_fir || "senza numero"}</span>
            <span className="text-muted-foreground truncate">
              {row.produttore_denominazione || "—"} → {row.destinatario_denominazione || "—"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {row.since ? new Date(row.since).toLocaleString("it-IT") : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
