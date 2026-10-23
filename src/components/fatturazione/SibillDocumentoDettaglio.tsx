import { useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/** Appiattisce l'oggetto Sibill in coppie campo → valore, per mostrare TUTTI i campi. */
function appiattisci(obj: any, prefix = "", out: [string, string][] = []): [string, string][] {
  if (obj == null || typeof obj !== "object") {
    out.push([prefix || "valore", obj == null ? "—" : String(obj)]);
    return out;
  }
  if (Array.isArray(obj)) {
    if (!obj.length) out.push([prefix, "—"]);
    obj.forEach((v, i) => appiattisci(v, `${prefix}[${i + 1}]`, out));
    return out;
  }
  const keys = Object.keys(obj);
  if (!keys.length) out.push([prefix, "—"]);
  for (const k of keys) appiattisci(obj[k], prefix ? `${prefix} › ${k}` : k, out);
  return out;
}

export function SibillDocumentoDettaglio({ docId, onClose }: { docId: string; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["sibill-doc", docId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("sibill-integration", { body: { action: "get_document", doc_id: docId } });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error(`${(data as any).error.title}: ${(data as any).error.detail}`);
      return data as { fonte: string; document: any };
    },
  });
  const righe = data?.document ? appiattisci(data.document) : [];

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-card border border-border/40" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div>
            <div className="font-semibold">Fattura {data?.document?.number || ""} — dati Sibill</div>
            {data && <div className="text-xs text-muted-foreground">{data.fonte === "sibill" ? "Letto ora da Sibill" : "Copia salvata (Sibill non raggiungibile)"} · {righe.length} campi</div>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto p-4">
          {isLoading && <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Lettura da Sibill…</div>}
          {error && <div className="text-sm text-destructive">{(error as any).message}</div>}
          {righe.length > 0 && (
            <table className="w-full text-xs">
              <tbody>
                {righe.map(([k, v], i) => (
                  <tr key={i} className="border-t border-border/20">
                    <td className="p-2 font-mono text-muted-foreground align-top w-2/5 break-all">{k}</td>
                    <td className="p-2 break-all">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
