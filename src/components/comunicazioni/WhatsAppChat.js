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
export function WhatsAppChat() {
    const [searchParams] = useSearchParams();
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;
    const { data: contatti } = useRubricaContatti();
    const { data: logs, refetch: refetchLogs } = useComunicazioniLog("whatsapp");
    const [numero, setNumero] = useState(searchParams.get("to") || "");
    const [messaggio, setMessaggio] = useState("");
    const [sending, setSending] = useState(false);
    const [showAddPrompt, setShowAddPrompt] = useState(false);
    const inRubrica = (contatti || []).some((c) => c.cellulare === numero || c.telefono === numero);
    const handleSend = async () => {
        if (!numero.trim() || !messaggio.trim()) {
            toast.error("Numero e messaggio obbligatori");
            return;
        }
        if (!inRubrica && !showAddPrompt) {
            setShowAddPrompt(true);
        }
        setSending(true);
        const { error } = await supabase.from("comunicazioni_log").insert({
            tenant_id: tenantId,
            canale: "whatsapp",
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
        toast.info("WhatsApp registrato — Meta Business API non ancora configurata");
        setMessaggio("");
        refetchLogs();
    };
    return (_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground uppercase tracking-wider", children: "Componi WhatsApp" }), _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { placeholder: "Numero WhatsApp", value: numero, onChange: (e) => { setNumero(e.target.value); setShowAddPrompt(false); }, className: "h-9" }), showAddPrompt && !inRubrica && tenantId && (_jsx(AddToRubricaPrompt, { tenantId: tenantId, destinatario: numero, tipo: "cellulare", onDismiss: () => setShowAddPrompt(false) })), _jsx(Textarea, { placeholder: "Scrivi il messaggio WhatsApp...", value: messaggio, onChange: (e) => setMessaggio(e.target.value), rows: 4, className: "bg-[#0b1517] border-emerald-900/30" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { onClick: handleSend, disabled: sending, size: "sm", className: "bg-emerald-600 hover:bg-emerald-700", children: [_jsx(Send, { className: "h-4 w-4 mr-1" }), " Invia WhatsApp"] }), _jsxs("span", { className: "text-xs text-amber-400 flex items-center gap-1", children: [_jsx(AlertTriangle, { className: "h-3 w-3" }), " Meta API non configurata"] })] })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground uppercase tracking-wider", children: "Storico WhatsApp" }), _jsxs("div", { className: "space-y-2 max-h-[400px] overflow-y-auto", children: [(logs || []).map((l) => (_jsxs("div", { className: "p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/20 text-sm", children: [_jsxs("div", { className: "flex justify-between text-xs text-muted-foreground mb-1", children: [_jsx("span", { children: l.destinatario }), _jsx("span", { children: format(new Date(l.created_at), "dd/MM/yy HH:mm") })] }), _jsx("p", { className: "text-foreground", children: l.contenuto }), _jsx("span", { className: `text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${l.stato === "inviato" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`, children: l.stato })] }, l.id))), (!logs || logs.length === 0) && _jsx("p", { className: "text-muted-foreground text-sm", children: "Nessun messaggio WhatsApp" })] })] })] }));
}
