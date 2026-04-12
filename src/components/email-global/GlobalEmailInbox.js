import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Componente inbox email Global Reco
import { useState } from "react";
import { useGlobalInbox, useToggleRead, useSyncInbox } from "@/hooks/useGlobalEmail";
import { Button } from "@/components/ui/button";
import { RefreshCw, Mail, MailOpen, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
export function GlobalEmailInbox() {
    const { data: emails, isLoading } = useGlobalInbox();
    const toggleRead = useToggleRead();
    const syncInbox = useSyncInbox();
    const [selectedId, setSelectedId] = useState(null);
    const selected = emails?.find((e) => e.id === selectedId);
    if (selected) {
        return (_jsxs("div", { className: "space-y-4", children: [_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => setSelectedId(null), children: [_jsx(ArrowLeft, { className: "h-4 w-4 mr-1" }), " Torna alla lista"] }), _jsxs("div", { className: "p-4 rounded-xl bg-card/60 border border-border/30 space-y-3", children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-foreground", children: selected.subject || "(nessun oggetto)" }), _jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: ["Da: ", selected.from_address] }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["A: ", selected.to_address] }), _jsx("p", { className: "text-xs text-muted-foreground", children: format(new Date(selected.received_at), "dd/MM/yyyy HH:mm") })] }), _jsxs(Button, { size: "sm", variant: "outline", onClick: () => toggleRead.mutate({ id: selected.id, is_read: !selected.is_read }), children: [selected.is_read ? _jsx(MailOpen, { className: "h-4 w-4 mr-1" }) : _jsx(Mail, { className: "h-4 w-4 mr-1" }), selected.is_read ? "Segna non letto" : "Segna letto"] })] }), selected.body_html ? (_jsx("div", { className: "prose prose-sm max-w-none text-foreground", dangerouslySetInnerHTML: { __html: selected.body_html } })) : (_jsx("pre", { className: "text-sm text-muted-foreground whitespace-pre-wrap", children: selected.body_text || "—" }))] })] }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground uppercase tracking-wider", children: "Inbox \u2014 globalreco@zoli.live" }), _jsxs(Button, { size: "sm", variant: "outline", onClick: () => syncInbox.mutate(), disabled: syncInbox.isPending, children: [_jsx(RefreshCw, { className: `h-4 w-4 mr-1 ${syncInbox.isPending ? "animate-spin" : ""}` }), " Sincronizza"] })] }), isLoading && _jsx("p", { className: "text-sm text-muted-foreground", children: "Caricamento..." }), _jsxs("div", { className: "space-y-2 max-h-[500px] overflow-y-auto", children: [(emails || []).map((e) => (_jsxs("button", { onClick: () => {
                            setSelectedId(e.id);
                            if (!e.is_read)
                                toggleRead.mutate({ id: e.id, is_read: true });
                        }, className: `w-full text-left p-3 rounded-lg border transition-colors ${e.is_read
                            ? "bg-card/40 border-border/20 text-muted-foreground"
                            : "bg-card/70 border-primary/30 text-foreground font-medium"} hover:bg-card/80`, children: [_jsxs("div", { className: "flex justify-between text-xs mb-1", children: [_jsx("span", { className: "truncate max-w-[60%]", children: e.from_address }), _jsx("span", { children: format(new Date(e.received_at), "dd/MM HH:mm") })] }), _jsx("p", { className: "text-sm truncate", children: e.subject || "(nessun oggetto)" })] }, e.id))), !isLoading && (!emails || emails.length === 0) && (_jsx("p", { className: "text-muted-foreground text-sm", children: "Nessuna email in inbox" }))] })] }));
}
