import { AdminLayout } from "@/components/layout/AdminLayout";
import { RubricaTab } from "@/components/comunicazioni/RubricaTab";

export default function RubricaPage() {
  return (
    <AdminLayout title="Rubrica" subtitle="Contatti aziendali">
      <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <RubricaTab basePath="/admin" />
      </div>
    </AdminLayout>
  );
}
