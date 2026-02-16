import { AdminLayout } from "@/components/layout/AdminLayout";

export default function RENTRIPage() {
  return (
    <AdminLayout title="RENTRI" subtitle="Gestione Registro Elettronico Nazionale">
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <h2 className="text-lg font-display text-foreground mb-2">Invii RENTRI</h2>
          <p className="text-sm text-muted-foreground">Monitoraggio invii al registro nazionale dei rifiuti.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
