import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Warehouse, Truck, Users, Globe } from "lucide-react";
import { DevGiacenzeModule } from "@/components/multynijol/dev/DevGiacenzeModule";
import { DevLogisticaModule } from "@/components/multynijol/dev/DevLogisticaModule";
import { DevPrivatiModule } from "@/components/multynijol/dev/DevPrivatiModule";
import { DevIntermediarioModule } from "@/components/multynijol/dev/DevIntermediarioModule";

export default function MNDevDashboardPage() {
  return (
    <MNAdminLayout title="🧪 Centro di Comando — Sviluppo" subtitle="Multyproget · Versione Test">
      <Tabs defaultValue="impianto" className="space-y-4">
        <TabsList className="bg-card/60 border border-border/30 backdrop-blur-xl p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="impianto" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Warehouse className="h-4 w-4" />
            Impianto & Giacenze
          </TabsTrigger>
          <TabsTrigger value="logistica" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Truck className="h-4 w-4" />
            Logistica & Targa
          </TabsTrigger>
          <TabsTrigger value="privati" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Users className="h-4 w-4" />
            Privati & Limiti
          </TabsTrigger>
          <TabsTrigger value="intermediario" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Globe className="h-4 w-4" />
            Intermediario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="impianto">
          <DevGiacenzeModule />
        </TabsContent>
        <TabsContent value="logistica">
          <DevLogisticaModule />
        </TabsContent>
        <TabsContent value="privati">
          <DevPrivatiModule />
        </TabsContent>
        <TabsContent value="intermediario">
          <DevIntermediarioModule />
        </TabsContent>
      </Tabs>
    </MNAdminLayout>
  );
}
