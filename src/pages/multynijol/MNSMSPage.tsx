import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { SMSComposer } from "@/components/comunicazioni/SMSComposer";

export default function MNSMSPage() {
  const { context } = useParams<{ context: string }>();
  return (
    <MNAdminLayout title="SMS" subtitle="Invio e storico messaggi SMS">
      <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <SMSComposer />
      </div>
    </MNAdminLayout>
  );
}
