import { AdminLayout } from "@/components/layout/AdminLayout";
import { EmailComposer } from "@/components/comunicazioni/EmailComposer";

export default function EmailPage() {
  return (
    <AdminLayout title="Email" subtitle="Invio e gestione email">
      <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <EmailComposer />
      </div>
    </AdminLayout>
  );
}
