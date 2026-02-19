import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { RubricaTab } from "@/components/comunicazioni/RubricaTab";

export default function MNRubricaPage() {
  const { context } = useParams<{ context: string }>();
  return (
    <MNAdminLayout title="Rubrica" subtitle="Contatti aziendali">
      <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <RubricaTab basePath={`/mn/admin/${context}`} />
      </div>
    </MNAdminLayout>
  );
}
