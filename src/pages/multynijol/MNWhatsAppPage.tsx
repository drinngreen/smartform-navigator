import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { WhatsAppChat } from "@/components/comunicazioni/WhatsAppChat";

export default function MNWhatsAppPage() {
  const { context } = useParams<{ context: string }>();
  return (
    <MNAdminLayout title="WhatsApp" subtitle="Messaggi WhatsApp Business">
      <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <WhatsAppChat />
      </div>
    </MNAdminLayout>
  );
}
