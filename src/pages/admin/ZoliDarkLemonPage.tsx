import { AdminLayout } from "@/components/layout/AdminLayout";

export default function ZoliDarkLemonPage() {
  return (
    <AdminLayout title="Zoli Dark Lemon" subtitle="Assistente AI Aziendale">
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <h2 className="text-lg font-display text-foreground mb-2">AI Assistant</h2>
          <p className="text-sm text-muted-foreground">Assistente intelligente per la gestione dei rifiuti e documentazione.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
