import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { AlertTriangle, MessageCircle, Phone, Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";

const LIMITE_KG = 1500;

export function PrivatiLimitiWidget({ tenantId }: { tenantId?: string }) {
  const [sendingId, setSendingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["privati-limiti-widget", tenantId],
    queryFn: async () => {
      const anno = new Date().getFullYear();
      let q = supabase.from("privati_conferimenti" as any)
        .select("nome_privato, cf_pi, kg_pesati, anno_dbt, tenant_id, privato_id")
        .eq("anno_dbt", anno);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;

      const rows = (data || []) as any[];
      const privatiIds = Array.from(new Set(rows.map(r => r.privato_id).filter(Boolean)));
      const telefoni = new Map<string, string>();
      if (privatiIds.length) {
        const { data: anag } = await supabase.from("anagrafica_privati" as any)
          .select("id, telefono")
          .in("id", privatiIds);
        for (const a of ((anag || []) as any[])) {
          if (a?.telefono) telefoni.set(a.id, a.telefono);
        }
      }

      const bykey = new Map<string, { nome: string; telefono?: string; cf?: string; kg: number }>();
      for (const r of rows) {
        const key = (r.cf_pi || r.nome_privato || "").toString().toUpperCase().trim();
        if (!key) continue;
        const tel = r.privato_id ? telefoni.get(r.privato_id) : undefined;
        const cur = bykey.get(key) || { nome: r.nome_privato || key, telefono: tel, cf: r.cf_pi, kg: 0 };
        cur.kg += Number(r.kg_pesati) || 0;
        if (!cur.telefono && tel) cur.telefono = tel;
        bykey.set(key, cur);
      }

      return Array.from(bykey.values())
        .filter(p => p.kg >= LIMITE_KG * 0.8)
        .sort((a, b) => b.kg - a.kg);
    },
    refetchInterval: 60_000,
  });

  const invia = async (p: { nome: string; telefono?: string; kg: number }) => {
    if (!p.telefono) return toast.error("Telefono mancante in anagrafica");
    const id = p.nome + p.telefono;
    setSendingId(id);
    try {
      const pct = Math.round((p.kg / LIMITE_KG) * 100);
      const msg = p.kg >= LIMITE_KG
        ? `Ciao ${p.nome}, il tuo limite annuo di ${LIMITE_KG} kg è stato SUPERATO (${p.kg.toLocaleString("it-IT")} kg). Non potrai conferire altro materiale fino al prossimo anno. Multyproget`
        : `Ciao ${p.nome}, sei al ${pct}% del limite annuo (${p.kg.toLocaleString("it-IT")} kg / ${LIMITE_KG} kg). Ti restano ${(LIMITE_KG - p.kg).toLocaleString("it-IT")} kg. Multyproget`;
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { to: p.telefono, message: msg, tenant_id: tenantId },
      });
      if (error) throw error;
      if ((data as any)?.provider === "wa.me" && (data as any)?.link) {
        window.open((data as any).link, "_blank");
        toast.success("Aperto WhatsApp Web (configura Meta API per invio diretto)");
      } else {
        toast.success("Avviso WhatsApp inviato");
      }
    } catch (e: any) {
      toast.error(e.message || "Errore invio");
    } finally {
      setSendingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 rounded-2xl border border-border/30 bg-card/60 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Caricamento limiti privati...
      </div>
    );
  }

  const items = data || [];

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-red-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-amber-400" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Scadenziario Privati — Limite 1500 kg/anno</h3>
          <p className="text-xs text-muted-foreground">Privati oltre l'80% del limite annuo con invio avviso WhatsApp</p>
        </div>
        <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">{items.length} in allerta</span>
      </div>

      {items.length === 0 ? (
        <div className="p-3 text-center text-sm text-muted-foreground">Nessun privato oltre soglia quest'anno ✅</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.map((p, i) => {
            const pct = Math.min(100, Math.round((p.kg / LIMITE_KG) * 100));
            const superato = p.kg >= LIMITE_KG;
            const id = p.nome + (p.telefono || "");
            return (
              <div key={i} className={`p-3 rounded-xl border ${superato ? "bg-red-500/10 border-red-500/40" : "bg-amber-500/10 border-amber-500/40"}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {superato && <AlertTriangle className="h-4 w-4 text-red-400" />}
                      <strong className="text-foreground text-sm truncate">{p.nome}</strong>
                      {p.cf && <span className="text-[10px] font-mono text-muted-foreground">{p.cf}</span>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span className={superato ? "text-red-300 font-semibold" : "text-amber-300 font-semibold"}>
                        {p.kg.toLocaleString("it-IT")} kg / {LIMITE_KG} kg ({pct}%)
                      </span>
                      {p.telefono ? (
                        <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{p.telefono}</span>
                      ) : (
                        <span className="text-red-400">telefono mancante</span>
                      )}
                    </div>
                    <div className="mt-2 h-1.5 rounded bg-background/40 overflow-hidden">
                      <div className={`h-full ${superato ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <button
                    onClick={() => invia(p)}
                    disabled={sendingId === id || !p.telefono}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {sendingId === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                    Avviso WhatsApp
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
