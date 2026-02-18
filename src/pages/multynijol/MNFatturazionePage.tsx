import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { FatturazioneModule } from "@/components/erp/FatturazioneModule";
import { useAuth } from "@/hooks/useAuth";

export default function MNFatturazionePage() {
  const { context } = useParams<{ context: string }>();
  const { profile } = useAuth();
  const contextLabel = context === "multyproget" ? "Multyproget" : "Niyol";

  return (
    <MNAdminLayout title={`Fatturazione — ${contextLabel}`} subtitle="Mini-ERP Contabile">
      <FatturazioneModule tenantId={profile?.tenant_id || undefined} />
    </MNAdminLayout>
  );
}
