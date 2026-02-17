import { useParams, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";

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
    <MNAdminLayout title={`Zoli Dark Lemon — ${contextLabel}`} subtitle="Assistente AI Aziendale">
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <h2 className="text-lg font-display text-foreground mb-2">AI Assistant — {contextLabel}</h2>
          <p className="text-sm text-muted-foreground">Assistente intelligente per la gestione dei rifiuti e documentazione {contextLabel}.</p>
        </div>
      </div>
    </MNAdminLayout>
  );
}
