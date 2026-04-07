import { jsx as _jsx } from "react/jsx-runtime";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { SMSComposer } from "@/components/comunicazioni/SMSComposer";
export default function SMSPage() {
    return (_jsx(AdminLayout, { title: "SMS", subtitle: "Invio e storico messaggi SMS", children: _jsx("div", { className: "p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: _jsx(SMSComposer, {}) }) }));
}
