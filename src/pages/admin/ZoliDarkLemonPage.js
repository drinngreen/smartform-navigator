import { jsx as _jsx } from "react/jsx-runtime";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DarkLemonChat } from "@/components/ai/DarkLemonChat";
export default function ZoliDarkLemonPage() {
    return (_jsx(AdminLayout, { title: "Dark Lemon AI", subtitle: "Assistente AI Aziendale", children: _jsx(DarkLemonChat, {}) }));
}
