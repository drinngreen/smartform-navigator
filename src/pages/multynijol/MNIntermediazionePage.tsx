import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { IntermediazioneModule } from "@/components/intermediazione/IntermediazioneModule";

export default function MNIntermediazionePage() {
  return (
    <MNAdminLayout title="Intermediazione" subtitle="Gestione intermediazione rifiuti Cat. 8">
      <IntermediazioneModule />
    </MNAdminLayout>
  );
}
