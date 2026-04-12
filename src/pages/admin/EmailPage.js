import { jsx as _jsx } from "react/jsx-runtime";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { EmailComposer } from "@/components/comunicazioni/EmailComposer";
export default function EmailPage() {
    return (_jsx(AdminLayout, { title: "Email", subtitle: "Invio e gestione email", children: _jsx("div", { className: "p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: _jsx(EmailComposer, {}) }) }));
}
