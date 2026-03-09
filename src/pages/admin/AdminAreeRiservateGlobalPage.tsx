import { AdminAreeRiservateImpianti } from "@/components/multynijol/AdminAreeRiservateImpianti";

export default function AdminAreeRiservateGlobalPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Aree Riservate Impianti — Global Reco</h1>
        <AdminAreeRiservateImpianti tenantFilter="167d07ad-9184-484e-85a6-da5ceafa42a3" />
      </div>
    </div>
  );
}
