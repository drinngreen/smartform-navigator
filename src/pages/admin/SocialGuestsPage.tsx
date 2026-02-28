import { AdminLayout } from "@/components/layout/AdminLayout";
import { SocialGuestsPanel } from "@/components/admin/SocialGuestsPanel";

export default function SocialGuestsPage() {
  return (
    <AdminLayout title="Ospiti Social" subtitle="Gestisci gli utenti social-only di Global Reco">
      <SocialGuestsPanel />
    </AdminLayout>
  );
}
