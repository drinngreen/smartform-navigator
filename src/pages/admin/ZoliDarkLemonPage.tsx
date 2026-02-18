import { AdminLayout } from "@/components/layout/AdminLayout";
import { DarkLemonChat } from "@/components/ai/DarkLemonChat";

export default function ZoliDarkLemonPage() {
  return (
    <AdminLayout title="Dark Lemon AI" subtitle="Assistente AI Aziendale">
      <DarkLemonChat />
    </AdminLayout>
  );
}
