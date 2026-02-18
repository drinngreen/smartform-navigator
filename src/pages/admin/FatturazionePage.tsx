import { AdminLayout } from "@/components/layout/AdminLayout";
import { FatturazioneModule } from "@/components/erp/FatturazioneModule";
import { useAuth } from "@/hooks/useAuth";

export default function FatturazionePage() {
  const { profile } = useAuth();
  return (
    <AdminLayout title="Fatturazione" subtitle="Mini-ERP Contabile">
      <FatturazioneModule tenantId={profile?.tenant_id || undefined} />
    </AdminLayout>
  );
}
