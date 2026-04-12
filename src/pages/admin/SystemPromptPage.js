import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { SystemPromptRequestForm } from "@/components/system-prompt/SystemPromptRequestForm";
import { SystemPromptAssistantChat } from "@/components/system-prompt/SystemPromptAssistantChat";
// Global Reco tenant
const GLOBAL_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";
export default function SystemPromptPage() {
    return (_jsx(AdminLayout, { title: "System Prompt", subtitle: "Configurazione AI Agent", children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsx("div", { className: "lg:col-span-2", children: _jsx(SystemPromptRequestForm, { tenantLabel: "global", tenantId: GLOBAL_TENANT_ID, tenantName: "Global Reco" }) }), _jsx("div", { children: _jsx(SystemPromptAssistantChat, {}) })] }) }));
}
