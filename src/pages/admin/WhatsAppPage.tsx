import { AdminLayout } from "@/components/layout/AdminLayout";
import { WhatsAppChat } from "@/components/comunicazioni/WhatsAppChat";

export default function WhatsAppPage() {
  return (
    <AdminLayout title="WhatsApp" subtitle="Messaggi WhatsApp Business">
      <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <WhatsAppChat />
      </div>
    </AdminLayout>
  );
}
