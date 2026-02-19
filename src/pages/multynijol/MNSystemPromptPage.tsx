import { useParams, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";
import { SystemPromptRequestForm } from "@/components/system-prompt/SystemPromptRequestForm";
import { SystemPromptAssistantChat } from "@/components/system-prompt/SystemPromptAssistantChat";

const validContexts = ["multyproget", "niyol"];

export default function MNSystemPromptPage() {
  const { context } = useParams<{ context: string }>();
  const setActiveContext = useMNContextStore((s) => s.setActiveContext);
  const isValid = !!context && validContexts.includes(context);
  const mnCtx = MN_CONTEXTS.find((c) => c.id === context) || MN_CONTEXTS[0];

  useEffect(() => { if (isValid) setActiveContext(mnCtx); }, [context, isValid]);

  if (!isValid) return <Navigate to="/mn/admin" replace />;
  const contextLabel = context === "multyproget" ? "Multyproget" : "Niyol";

  return (
    <MNAdminLayout title={`System Prompt — ${contextLabel}`} subtitle="Configurazione AI Agent">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SystemPromptRequestForm
            tenantLabel={context}
            tenantId={mnCtx.tenantId}
            tenantName={contextLabel}
          />
        </div>
        <div>
          <SystemPromptAssistantChat />
        </div>
      </div>
    </MNAdminLayout>
  );
}
