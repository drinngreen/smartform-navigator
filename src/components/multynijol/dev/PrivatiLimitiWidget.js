import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { AlertTriangle, MessageCircle, Phone, Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";
const LIMITE_KG = 1500;
export function PrivatiLimitiWidget({ tenantId }) {
    const [sendingId, setSendingId] = useState(null);
    const { data, isLoading } = useQuery({
        queryKey: ["privati-limiti-widget", tenantId],
        queryFn: async () => {
            const anno = new Date().getFullYear();
            let q = supabase.from("privati_conferimenti")
                .select("nome_privato, telefono_privato, cf_piva_privato, kg_pesati, anno_dbt, tenant_id")
                .eq("anno_dbt", anno);
            if (tenantId)
                q = q.eq("tenant_id", tenantId);
            const { data, error } = await q;
            if (error)
                throw error;
            const bykey = new Map();
            for (const r of (data || [])) {
                const key = (r.cf_piva_privato || r.nome_privato || "").toString().toUpperCase().trim();
                if (!key)
                    continue;
                const cur = bykey.get(key) || { nome: r.nome_privato || key, telefono: r.telefono_privato, cf: r.cf_piva_privato, kg: 0 };
                cur.kg += Number(r.kg_pesati) || 0;
                if (!cur.telefono && r.telefono_privato)
                    cur.telefono = r.telefono_privato;
                bykey.set(key, cur);
            }
            return Array.from(bykey.values())
                .filter(p => p.kg >= LIMITE_KG * 0.8)
                .sort((a, b) => b.kg - a.kg);
        },
        refetchInterval: 60000,
    });
    const invia = async (p) => {
        if (!p.telefono)
            return toast.error("Telefono mancante in anagrafica");
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
            if (error)
                throw error;
            if (data?.provider === "wa.me" && data?.link) {
                window.open(data.link, "_blank");
                toast.success("Aperto WhatsApp Web (configura Meta API per invio diretto)");
            }
            else {
                toast.success("Avviso WhatsApp inviato");
            }
        }
        catch (e) {
            toast.error(e.message || "Errore invio");
        }
        finally {
            setSendingId(null);
        }
    };
    if (isLoading) {
        return (_jsxs("div", { className: "p-4 rounded-2xl border border-border/30 bg-card/60 flex items-center gap-2 text-muted-foreground text-sm", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), " Caricamento limiti privati..."] }));
    }
    const items = data || [];
    return (_jsxs("div", { className: "rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-red-500/5 p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(ShieldAlert, { className: "h-5 w-5 text-amber-400" }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground", children: "Scadenziario Privati \u2014 Limite 1500 kg/anno" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Privati oltre l'80% del limite annuo con invio avviso WhatsApp" })] }), _jsxs("span", { className: "text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30", children: [items.length, " in allerta"] })] }), items.length === 0 ? (_jsx("div", { className: "p-3 text-center text-sm text-muted-foreground", children: "Nessun privato oltre soglia quest'anno \u2705" })) : (_jsx("div", { className: "space-y-2 max-h-96 overflow-y-auto", children: items.map((p, i) => {
                    const pct = Math.min(100, Math.round((p.kg / LIMITE_KG) * 100));
                    const superato = p.kg >= LIMITE_KG;
                    const id = p.nome + (p.telefono || "");
                    return (_jsx("div", { className: `p-3 rounded-xl border ${superato ? "bg-red-500/10 border-red-500/40" : "bg-amber-500/10 border-amber-500/40"}`, children: _jsxs("div", { className: "flex items-center justify-between gap-3 flex-wrap", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [superato && _jsx(AlertTriangle, { className: "h-4 w-4 text-red-400" }), _jsx("strong", { className: "text-foreground text-sm truncate", children: p.nome }), p.cf && _jsx("span", { className: "text-[10px] font-mono text-muted-foreground", children: p.cf })] }), _jsxs("div", { className: "mt-1 text-xs text-muted-foreground flex items-center gap-2 flex-wrap", children: [_jsxs("span", { className: superato ? "text-red-300 font-semibold" : "text-amber-300 font-semibold", children: [p.kg.toLocaleString("it-IT"), " kg / ", LIMITE_KG, " kg (", pct, "%)"] }), p.telefono ? (_jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Phone, { className: "h-3 w-3" }), p.telefono] })) : (_jsx("span", { className: "text-red-400", children: "telefono mancante" }))] }), _jsx("div", { className: "mt-2 h-1.5 rounded bg-background/40 overflow-hidden", children: _jsx("div", { className: `h-full ${superato ? "bg-red-500" : "bg-amber-500"}`, style: { width: `${pct}%` } }) })] }), _jsxs("button", { onClick: () => invia(p), disabled: sendingId === id || !p.telefono, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed", children: [sendingId === id ? _jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : _jsx(MessageCircle, { className: "h-3.5 w-3.5" }), "Avviso WhatsApp"] })] }) }, i));
                }) }))] }));
}
