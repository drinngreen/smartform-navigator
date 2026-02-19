import { AdminLayout } from "@/components/layout/AdminLayout";
import { IntermediazioneModule } from "@/components/intermediazione/IntermediazioneModule";

export default function IntermediazionePage() {
  return (
    <AdminLayout title="Intermediazione" subtitle="Gestione intermediazione rifiuti Cat. 8">
      <IntermediazioneModule />
    </AdminLayout>
  );
}
