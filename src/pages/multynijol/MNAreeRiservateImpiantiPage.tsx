import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { AdminAreeRiservateImpianti } from "@/components/multynijol/AdminAreeRiservateImpianti";
import { useParams } from "react-router-dom";

const CONTEXT_TENANT_MAP: Record<string, string> = {
  "multyproget": "77ec9a3d-602e-438f-97bf-1c69abd8f691",
  "dev-multyproget": "77ec9a3d-602e-438f-97bf-1c69abd8f691",
  "niyol": "819c783e-78dd-4080-8265-802e75b0d813",
};

export default function MNAreeRiservateImpiantiPage() {
  const { context } = useParams<{ context: string }>();
  const tenantId = context ? CONTEXT_TENANT_MAP[context] : undefined;

  return (
    <MNAdminLayout title="Aree Riservate Impianti" subtitle="Gestione accessi impianti destinatari">
      <AdminAreeRiservateImpianti tenantFilter={tenantId} />
    </MNAdminLayout>
  );
}
