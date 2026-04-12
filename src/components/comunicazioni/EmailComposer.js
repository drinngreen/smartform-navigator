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
export function EmailComposer() {
    const [searchParams] = useSearchParams();
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;
    const { data: contatti } = useRubricaContatti();
    const { data: logs, refetch: refetchLogs } = useComunicazioniLog("email");
    const [emailTo, setEmailTo] = useState(searchParams.get("to") || "");
    const [oggetto, setOggetto] = useState("");
    const [corpo, setCorpo] = useState("");
    const [sending, setSending] = useState(false);
    const [showAddPrompt, setShowAddPrompt] = useState(false);
    const inRubrica = (contatti || []).some((c) => c.email === emailTo || c.pec === emailTo);
    const handleSend = async () => {
        if (!emailTo.trim() || !corpo.trim()) {
            toast.error("Email e contenuto obbligatori");
            return;
        }
        if (!inRubrica && !showAddPrompt) {
            setShowAddPrompt(true);
        }
        setSending(true);
        const { error } = await supabase.from("comunicazioni_log").insert({
            tenant_id: tenantId,
            canale: "email",
            destinatario: emailTo,
            oggetto,
            contenuto: corpo,
            stato: "in_coda",
            created_by: profile?.user_id,
        });
        setSending(false);
        if (error) {
            toast.error("Errore: " + error.message);
            return;
        }
        toast.info("Email registrata — Provider email non ancora configurato");
        setCorpo("");
        setOggetto("");
        refetchLogs();
    };
    return (_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground uppercase tracking-wider", children: "Componi Email" }), _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { placeholder: "Indirizzo email destinatario", value: emailTo, onChange: (e) => { setEmailTo(e.target.value); setShowAddPrompt(false); }, className: "h-9" }), showAddPrompt && !inRubrica && tenantId && (_jsx(AddToRubricaPrompt, { tenantId: tenantId, destinatario: emailTo, tipo: "email", onDismiss: () => setShowAddPrompt(false) })), _jsx(Input, { placeholder: "Oggetto", value: oggetto, onChange: (e) => setOggetto(e.target.value), className: "h-9" }), _jsx(Textarea, { placeholder: "Corpo dell'email...", value: corpo, onChange: (e) => setCorpo(e.target.value), rows: 6 }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { onClick: handleSend, disabled: sending, size: "sm", children: [_jsx(Send, { className: "h-4 w-4 mr-1" }), " Invia Email"] }), _jsxs("span", { className: "text-xs text-amber-400 flex items-center gap-1", children: [_jsx(AlertTriangle, { className: "h-3 w-3" }), " Provider non configurato"] })] })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground uppercase tracking-wider", children: "Storico Email" }), _jsxs("div", { className: "space-y-2 max-h-[400px] overflow-y-auto", children: [(logs || []).map((l) => (_jsxs("div", { className: "p-3 rounded-lg bg-card/60 border border-border/20 text-sm", children: [_jsxs("div", { className: "flex justify-between text-xs text-muted-foreground mb-1", children: [_jsx("span", { children: l.destinatario }), _jsx("span", { children: format(new Date(l.created_at), "dd/MM/yy HH:mm") })] }), l.oggetto && _jsx("p", { className: "font-medium text-foreground text-xs mb-1", children: l.oggetto }), _jsx("p", { className: "text-muted-foreground", children: l.contenuto }), _jsx("span", { className: `text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${l.stato === "inviato" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`, children: l.stato })] }, l.id))), (!logs || logs.length === 0) && _jsx("p", { className: "text-muted-foreground text-sm", children: "Nessuna email inviata" })] })] })] }));
}
