import { AdminLayout } from "@/components/layout/AdminLayout";

export default function AdminMessagesPage() {
  return (
    <AdminLayout title="Zoli Messages" subtitle="Messaggistica interna">
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <h2 className="text-lg font-display text-foreground mb-2">Messaggi</h2>
          <p className="text-sm text-muted-foreground">Comunicazioni con autisti e operatori.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
