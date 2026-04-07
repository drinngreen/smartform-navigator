import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";
import { SystemPromptRequestForm } from "@/components/system-prompt/SystemPromptRequestForm";
import { SystemPromptAssistantChat } from "@/components/system-prompt/SystemPromptAssistantChat";
const validContexts = ["multyproget", "niyol"];
export default function MNSystemPromptPage() {
    const { context } = useParams();
    const setActiveContext = useMNContextStore((s) => s.setActiveContext);
    const isValid = !!context && validContexts.includes(context);
    const mnCtx = MN_CONTEXTS.find((c) => c.id === context) || MN_CONTEXTS[0];
    useEffect(() => { if (isValid)
        setActiveContext(mnCtx); }, [context, isValid]);
    if (!isValid)
        return _jsx(Navigate, { to: "/mn/admin", replace: true });
    const contextLabel = context === "multyproget" ? "Multyproget" : "Niyol";
    return (_jsx(MNAdminLayout, { title: `System Prompt — ${contextLabel}`, subtitle: "Configurazione AI Agent", children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsx("div", { className: "lg:col-span-2", children: _jsx(SystemPromptRequestForm, { tenantLabel: context, tenantId: mnCtx.tenantId, tenantName: contextLabel }) }), _jsx("div", { children: _jsx(SystemPromptAssistantChat, {}) })] }) }));
}
