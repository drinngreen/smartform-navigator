import { AdminLayout } from "@/components/layout/AdminLayout";

export default function PersonalePage() {
  return (
    <AdminLayout title="Personale" subtitle="Gestione autisti e operatori">
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <h2 className="text-lg font-display text-foreground mb-2">Elenco Personale</h2>
          <p className="text-sm text-muted-foreground">Gestione profili, assegnazione FIR e monitoraggio presenze.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
