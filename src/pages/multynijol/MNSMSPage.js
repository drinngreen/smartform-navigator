import { jsx as _jsx } from "react/jsx-runtime";
import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { SMSComposer } from "@/components/comunicazioni/SMSComposer";
export default function MNSMSPage() {
    const { context } = useParams();
    return (_jsx(MNAdminLayout, { title: "SMS", subtitle: "Invio e storico messaggi SMS", children: _jsx("div", { className: "p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: _jsx(SMSComposer, {}) }) }));
}
