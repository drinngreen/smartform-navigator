import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Pagina email completa Global Reco con tabs Inbox/Inviate/Componi
import { useState } from "react";
import { useIsGlobalReco } from "@/hooks/useGlobalEmail";
import { GlobalEmailInbox } from "./GlobalEmailInbox";
import { GlobalEmailOutbox } from "./GlobalEmailOutbox";
import { GlobalEmailCompose } from "./GlobalEmailCompose";
import { Mail, Send, Inbox } from "lucide-react";
const tabs = [
    { id: "inbox", label: "Inbox", icon: Inbox },
    { id: "outbox", label: "Inviate", icon: Send },
    { id: "compose", label: "Componi", icon: Mail },
];
export function GlobalEmailPage() {
    const isGR = useIsGlobalReco();
    const [activeTab, setActiveTab] = useState("inbox");
    if (!isGR) {
        return (_jsx("div", { className: "p-6 text-center text-muted-foreground", children: _jsx("p", { children: "Le funzionalit\u00E0 email sono disponibili solo per il tenant Global Reco." }) }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex gap-1 border-b border-border/30 pb-2", children: tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (_jsxs("button", { onClick: () => setActiveTab(tab.id), className: `flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm transition-colors ${activeTab === tab.id
                            ? "bg-primary/15 text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"}`, children: [_jsx(Icon, { className: "h-4 w-4" }), tab.label] }, tab.id));
                }) }), activeTab === "inbox" && _jsx(GlobalEmailInbox, {}), activeTab === "outbox" && _jsx(GlobalEmailOutbox, {}), activeTab === "compose" && _jsx(GlobalEmailCompose, {})] }));
}
