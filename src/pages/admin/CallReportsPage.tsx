import { AdminLayout } from "@/components/layout/AdminLayout";

export default function CallReportsPage() {
  return (
    <AdminLayout title="Report Chiamate" subtitle="Storico chiamate e trascrizioni">
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <h2 className="text-lg font-display text-foreground mb-2">Chiamate Recenti</h2>
          <p className="text-sm text-muted-foreground">Report delle chiamate in ingresso e in uscita con trascrizione AI.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
