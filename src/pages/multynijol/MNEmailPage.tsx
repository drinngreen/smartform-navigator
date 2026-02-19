import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { EmailComposer } from "@/components/comunicazioni/EmailComposer";

export default function MNEmailPage() {
  const { context } = useParams<{ context: string }>();
  return (
    <MNAdminLayout title="Email" subtitle="Invio e gestione email">
      <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <EmailComposer />
      </div>
    </MNAdminLayout>
  );
}
