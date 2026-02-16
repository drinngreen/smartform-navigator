import { AdminLayout } from "@/components/layout/AdminLayout";

export default function FormulariPage() {
  return (
    <AdminLayout title="Formulari" subtitle="Gestione formulari di trasporto">
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <h2 className="text-lg font-display text-foreground mb-2">Formulari FIR</h2>
          <p className="text-sm text-muted-foreground">Creazione e gestione formulari di identificazione rifiuti.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
