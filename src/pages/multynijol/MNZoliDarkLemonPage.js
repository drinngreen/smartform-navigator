import { jsx as _jsx } from "react/jsx-runtime";
import { useParams, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";
import { DarkLemonMNChat } from "@/components/ai/DarkLemonMNChat";
const validContexts = ["multyproget", "niyol"];
export default function MNZoliDarkLemonPage() {
    const { context } = useParams();
    const setActiveContext = useMNContextStore((s) => s.setActiveContext);
    const isValid = !!context && validContexts.includes(context);
    const mnCtx = MN_CONTEXTS.find((c) => c.id === context) || MN_CONTEXTS[0];
    useEffect(() => { if (isValid)
        setActiveContext(mnCtx); }, [context, isValid]);
    if (!isValid)
        return _jsx(Navigate, { to: "/mn/admin", replace: true });
    const contextLabel = context === "multyproget" ? "Multyproget" : "Niyol";
    return (_jsx(MNAdminLayout, { title: `Dark Lemon AI — ${contextLabel}`, subtitle: "Assistente AI Aziendale con accesso DB", children: _jsx(DarkLemonMNChat, { context: context }) }));
}
