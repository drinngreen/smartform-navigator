import { AdminLayout } from "@/components/layout/AdminLayout";
import { GlobalEmailPage as GlobalEmailContent } from "@/components/email-global/GlobalEmailPage";

export default function GlobalEmailPage() {
  return (
    <AdminLayout title="Email Global Reco" subtitle="Inbox, invio e storico email — globalreco@zoli.live">
      <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <GlobalEmailContent />
      </div>
    </AdminLayout>
  );
}
