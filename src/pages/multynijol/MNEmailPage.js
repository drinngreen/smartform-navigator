import { jsx as _jsx } from "react/jsx-runtime";
import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { EmailComposer } from "@/components/comunicazioni/EmailComposer";
export default function MNEmailPage() {
    const { context } = useParams();
    return (_jsx(MNAdminLayout, { title: "Email", subtitle: "Invio e gestione email", children: _jsx("div", { className: "p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: _jsx(EmailComposer, {}) }) }));
}
