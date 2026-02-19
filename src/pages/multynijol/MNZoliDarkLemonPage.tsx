import { useParams, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";
import { DarkLemonMNChat } from "@/components/ai/DarkLemonMNChat";

const validContexts = ["multyproget", "niyol"];

export default function MNZoliDarkLemonPage() {
  const { context } = useParams<{ context: string }>();
  const setActiveContext = useMNContextStore((s) => s.setActiveContext);
  const isValid = !!context && validContexts.includes(context);
  const mnCtx = MN_CONTEXTS.find((c) => c.id === context) || MN_CONTEXTS[0];

  useEffect(() => { if (isValid) setActiveContext(mnCtx); }, [context, isValid]);

  if (!isValid) return <Navigate to="/mn/admin" replace />;
  const contextLabel = context === "multyproget" ? "Multyproget" : "Niyol";

  return (
    <MNAdminLayout title={`Dark Lemon AI — ${contextLabel}`} subtitle="Assistente AI Aziendale con accesso DB">
      <DarkLemonMNChat context={context} />
    </MNAdminLayout>
  );
}
