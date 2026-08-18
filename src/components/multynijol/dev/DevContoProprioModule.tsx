import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DevLogisticaModule } from "./DevLogisticaModule";
import { FatturazioneModule } from "@/components/erp/FatturazioneModule";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";
import { DevFormulariList } from "./DevFormulariList";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, CreditCard, FileText } from "lucide-react";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const GLOBAL_FIR_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";

export function DevContoProprioModule() {
  const { profile } = useAuth();

  return (
    <Tabs defaultValue="formulari" className="space-y-4">
      <TabsList className="bg-card/60 border border-border/30 p-1 h-auto flex-wrap gap-1">
        <TabsTrigger value="nuovo-fir" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <Plus className="h-4 w-4" /> Nuovo FIR
        </TabsTrigger>
        <TabsTrigger value="formulari" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <FileText className="h-4 w-4" /> Formulari
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
          <MNFIRFormComplete tenantId={MULTY_TENANT_ID} mnContext="multyproget" enableFatturazione />
        </div>
      </TabsContent>
      <TabsContent value="formulari">
        <div className="p-4 rounded-2xl bg-card/60 border border-emerald-500/20">
          <DevFormulariList
            tenantId={MULTY_TENANT_ID}
            mnContext="multyproget"
            fallbackTenantId={GLOBAL_FIR_TENANT_ID}
            accent="emerald"
            title="Formulari Conto Proprio Multyproget — solo trasporti propri (CF 12347770013)"
            filterByTrasportatoreCf="12347770013"
          />
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
