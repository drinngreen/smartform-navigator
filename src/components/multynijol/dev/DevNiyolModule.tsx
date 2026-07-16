import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Truck } from "lucide-react";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";
import { DevFormulariList } from "./DevFormulariList";

const NIYOL_TENANT_ID = "819c783e-78dd-4080-8265-802e75b0d813";
const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL_CF = "09879800010";

export function DevNiyolModule() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex items-center gap-2 text-cyan-300">
          <Truck className="h-4 w-4" />
          <span className="text-sm font-semibold">Vista parallela Niyol</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Formulari di proprietà Niyol + formulari Multyproget in cui Niyol figura come trasportatore (etichettati "cross").
        </p>
      </div>

      <Tabs defaultValue="formulari" className="space-y-4">
        <TabsList className="bg-card/60 border border-border/30 p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="formulari" className="gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
            <FileText className="h-4 w-4" /> Formulari Niyol
          </TabsTrigger>
          <TabsTrigger value="nuovo-fir" className="gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
            <Plus className="h-4 w-4" /> Nuovo FIR Niyol
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formulari">
          <DevFormulariList
            tenantId={NIYOL_TENANT_ID}
            mnContext="niyol"
            accent="cyan"
            title="Formulari Niyol (con cross Multy dove Niyol è trasportatore)"
            crossTenantId={MULTY_TENANT_ID}
            crossTransporterCf={NIYOL_CF}
          />
        </TabsContent>

        <TabsContent value="nuovo-fir">
          <div className="p-4 rounded-2xl bg-card/60 border border-cyan-500/20">
            <MNFIRFormComplete tenantId={NIYOL_TENANT_ID} mnContext="niyol" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
