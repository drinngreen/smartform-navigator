import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useRubricaContatti, useComunicazioniLog } from "@/hooks/useRubricaContatti";
import { AddToRubricaPrompt } from "./AddToRubricaPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
export function SMSComposer() {
    const [searchParams] = useSearchParams();
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;
    const { data: contatti } = useRubricaContatti();
    const { data: logs, refetch: refetchLogs } = useComunicazioniLog("sms");
    const [numero, setNumero] = useState(searchParams.get("to") || "");
    const [messaggio, setMessaggio] = useState("");
    const [sending, setSending] = useState(false);
    const [showAddPrompt, setShowAddPrompt] = useState(false);
    const inRubrica = (contatti || []).some((c) => c.telefono === numero || c.cellulare === numero);
    const handleSend = async () => {
        if (!numero.trim() || !messaggio.trim()) {
            toast.error("Numero e messaggio obbligatori");
            return;
        }
        if (!inRubrica && !showAddPrompt) {
            setShowAddPrompt(true);
        }
        setSending(true);
        // Log the message (actual send will be enabled with provider)
        const { error } = await supabase.from("comunicazioni_log").insert({
            tenant_id: tenantId,
            canale: "sms",
            destinatario: numero,
            contenuto: messaggio,
            stato: "in_coda",
            created_by: profile?.user_id,
        });
        setSending(false);
        if (error) {
            toast.error("Errore: " + error.message);
            return;
        }
        toast.info("SMS registrato — Provider SMS non ancora configurato");
        setMessaggio("");
        refetchLogs();
    };
    return (_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground uppercase tracking-wider", children: "Componi SMS" }), _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { placeholder: "Numero destinatario", value: numero, onChange: (e) => { setNumero(e.target.value); setShowAddPrompt(false); }, className: "h-9" }), showAddPrompt && !inRubrica && tenantId && (_jsx(AddToRubricaPrompt, { tenantId: tenantId, destinatario: numero, tipo: "telefono", onDismiss: () => setShowAddPrompt(false) })), _jsx(Textarea, { placeholder: "Scrivi il messaggio...", value: messaggio, onChange: (e) => setMessaggio(e.target.value), rows: 4 }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { onClick: handleSend, disabled: sending, size: "sm", children: [_jsx(Send, { className: "h-4 w-4 mr-1" }), " Invia SMS"] }), _jsxs("span", { className: "text-xs text-amber-400 flex items-center gap-1", children: [_jsx(AlertTriangle, { className: "h-3 w-3" }), " Provider non configurato"] })] })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground uppercase tracking-wider", children: "Storico SMS" }), _jsxs("div", { className: "space-y-2 max-h-[400px] overflow-y-auto", children: [(logs || []).map((l) => (_jsxs("div", { className: "p-3 rounded-lg bg-card/60 border border-border/20 text-sm", children: [_jsxs("div", { className: "flex justify-between text-xs text-muted-foreground mb-1", children: [_jsx("span", { children: l.destinatario }), _jsx("span", { children: format(new Date(l.created_at), "dd/MM/yy HH:mm") })] }), _jsx("p", { className: "text-foreground", children: l.contenuto }), _jsx("span", { className: `text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${l.stato === "inviato" ? "bg-emerald-500/20 text-emerald-400" : l.stato === "errore" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`, children: l.stato })] }, l.id))), (!logs || logs.length === 0) && _jsx("p", { className: "text-muted-foreground text-sm", children: "Nessun SMS inviato" })] })] })] }));
}
