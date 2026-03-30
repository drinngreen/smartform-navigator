import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Componente composizione email manuale Global Reco
import { useState } from "react";
import { useSendGlobalEmail } from "@/hooks/useGlobalEmail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
export function GlobalEmailCompose() {
    const sendEmail = useSendGlobalEmail();
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState("");
    const [html, setHtml] = useState("");
    const handleSend = () => {
        if (!to.trim())
            return;
        sendEmail.mutate({ to, subject, html: html || `<p>${html}</p>`, category: "manuale" }, {
            onSuccess: () => {
                setTo("");
                setSubject("");
                setHtml("");
            },
        });
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground uppercase tracking-wider", children: "Nuova Email" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground mb-1 block", children: "Da" }), _jsx(Input, { value: "globalreco@zoli.live", disabled: true, className: "h-9 opacity-60" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground mb-1 block", children: "Destinatario *" }), _jsx(Input, { placeholder: "email@esempio.com", value: to, onChange: (e) => setTo(e.target.value), className: "h-9" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground mb-1 block", children: "Oggetto" }), _jsx(Input, { placeholder: "Oggetto email", value: subject, onChange: (e) => setSubject(e.target.value), className: "h-9" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground mb-1 block", children: "Corpo" }), _jsx(Textarea, { placeholder: "Scrivi il contenuto dell'email...", value: html, onChange: (e) => setHtml(e.target.value), rows: 8 })] }), _jsxs(Button, { onClick: handleSend, disabled: sendEmail.isPending || !to.trim(), size: "sm", children: [_jsx(Send, { className: "h-4 w-4 mr-1" }), " ", sendEmail.isPending ? "Invio..." : "Invia Email"] })] })] }));
}
