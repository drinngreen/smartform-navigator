import { jsx as _jsx } from "react/jsx-runtime";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { SocialGuestsPanel } from "@/components/admin/SocialGuestsPanel";
export default function SocialGuestsPage() {
    return (_jsx(AdminLayout, { title: "Ospiti Social", subtitle: "Gestisci gli utenti social-only di Global Reco", children: _jsx(SocialGuestsPanel, {}) }));
}
