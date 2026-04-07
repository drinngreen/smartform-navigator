import { jsx as _jsx } from "react/jsx-runtime";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { GlobalEmailPage as GlobalEmailContent } from "@/components/email-global/GlobalEmailPage";
export default function GlobalEmailPage() {
    return (_jsx(AdminLayout, { title: "Email Global Reco", subtitle: "Inbox, invio e storico email \u2014 globalreco@zoli.live", children: _jsx("div", { className: "p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: _jsx(GlobalEmailContent, {}) }) }));
}
