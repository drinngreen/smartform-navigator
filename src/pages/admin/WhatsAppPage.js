import { jsx as _jsx } from "react/jsx-runtime";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { WhatsAppChat } from "@/components/comunicazioni/WhatsAppChat";
export default function WhatsAppPage() {
    return (_jsx(AdminLayout, { title: "WhatsApp", subtitle: "Messaggi WhatsApp Business", children: _jsx("div", { className: "p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: _jsx(WhatsAppChat, {}) }) }));
}
