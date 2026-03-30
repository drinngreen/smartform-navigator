import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AdminLayout } from "@/components/layout/AdminLayout";
export default function CallReportsPage() {
    return (_jsx(AdminLayout, { title: "Report Chiamate", subtitle: "Storico chiamate e trascrizioni", children: _jsx("div", { className: "space-y-6", children: _jsxs("div", { className: "p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx("h2", { className: "text-lg font-display text-foreground mb-2", children: "Chiamate Recenti" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Report delle chiamate in ingresso e in uscita con trascrizione AI." })] }) }) }));
}
