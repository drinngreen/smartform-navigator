import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DevLogisticaModule } from "./DevLogisticaModule";
import { FatturazioneModule } from "@/components/erp/FatturazioneModule";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, CreditCard } from "lucide-react";

export function DevContoProprioModule() {
  const { profile } = useAuth();

  return (
    <Tabs defaultValue="nuovo-fir" className="space-y-4">
      <TabsList className="bg-card/60 border border-border/30 p-1 h-auto flex-wrap gap-1">
        <TabsTrigger value="nuovo-fir" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <Plus className="h-4 w-4" /> Nuovo FIR
        </TabsTrigger>
        <TabsTrigger value="logistica" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <Search className="h-4 w-4" /> Logistica & Targa
        </TabsTrigger>
        <TabsTrigger value="fatturazione" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <CreditCard className="h-4 w-4" /> Fatturazione
        </TabsTrigger>
      </TabsList>

      <TabsContent value="nuovo-fir">
        <div className="p-4 rounded-2xl bg-card/60 border border-emerald-500/20">
          <MNFIRFormComplete />
        </div>
      </TabsContent>
      <TabsContent value="logistica">
        <DevLogisticaModule />
      </TabsContent>
      <TabsContent value="fatturazione">
        <div className="p-4 rounded-2xl bg-card/60 border border-emerald-500/20">
          <FatturazioneModule tenantId={profile?.tenant_id || undefined} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
