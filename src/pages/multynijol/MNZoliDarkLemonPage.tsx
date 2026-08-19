import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";
import { DarkLemonMNChat } from "@/components/ai/DarkLemonMNChat";
import { Button } from "@/components/ui/button";
import { PanelRightOpen } from "lucide-react";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";

const validContexts = ["multyproget", "niyol"];

export default function MNZoliDarkLemonPage() {
  const { context } = useParams<{ context: string }>();
  const navigate = useNavigate();
  const setActiveContext = useMNContextStore((s) => s.setActiveContext);
  const setSidePanel = useZoliDarkLemonWidgetStore((s) => s.setSidePanel);
  const isValid = !!context && validContexts.includes(context);
  const mnCtx = MN_CONTEXTS.find((c) => c.id === context) || MN_CONTEXTS[0];

  useEffect(() => { if (isValid) setActiveContext(mnCtx); }, [context, isValid]);

  if (!isValid) return <Navigate to="/mn/admin" replace />;
  const contextLabel = context === "multyproget" ? "Multyproget" : "Niyol";

  const backToSide = () => {
    setSidePanel(true);
    navigate(-1);
  };

  return (
    <MNAdminLayout title={`Dark Lemon AI — ${contextLabel}`} subtitle="Assistente AI Aziendale con accesso DB">
      <div className="flex justify-end mb-3">
        <Button variant="outline" size="sm" onClick={backToSide}>
          <PanelRightOpen className="w-4 h-4 mr-2" />
          Torna a vista laterale
        </Button>
      </div>
      <DarkLemonMNChat context={context} />
    </MNAdminLayout>
  );
}
