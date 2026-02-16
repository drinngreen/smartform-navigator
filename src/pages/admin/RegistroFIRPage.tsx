import { AdminLayout } from "@/components/layout/AdminLayout";

export default function RegistroFIRPage() {
  return (
    <AdminLayout title="Registro Carico / Scarico" subtitle="Formulari di Identificazione Rifiuti">
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <h2 className="text-lg font-display text-foreground mb-2">Registro FIR</h2>
          <p className="text-sm text-muted-foreground">Elenco completo dei formulari con filtri avanzati.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
