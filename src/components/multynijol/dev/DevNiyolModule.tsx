import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText, Plus, Printer, Radar, Receipt, Settings2, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NuovoFirCartaceoBox } from "@/components/fir/NuovoFirCartaceoBox";
import { RentriFirCartaceiPanel } from "@/components/rentri/RentriFirCartaceiPanel";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";
import { DevFormulariList } from "./DevFormulariList";

const NIYOL_TENANT_ID = "819c783e-78dd-4080-8265-802e75b0d813";
const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL_CF = "09879800010";

// Sezioni Niyol raggiungibili direttamente da MultyDev (stesso tenant Niyol).
const SEZIONI_NIYOL = [
  { label: "Registro Niyol", href: "/mn/admin/niyol/registro", icon: BookOpen },
  { label: "Gestione FIR", href: "/mn/admin/niyol/gestione-fir", icon: Settings2 },
  { label: "RENTRI Niyol", href: "/mn/admin/niyol/rentri", icon: Radar },
  { label: "Personale Niyol", href: "/mn/admin/niyol/personale", icon: Users },
  { label: "Fatturazione Niyol", href: "/mn/admin/niyol/fatturazione", icon: Receipt },
];

export function DevNiyolModule() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
        <div>
          <div className="flex items-center gap-2 text-cyan-300">
            <Truck className="h-4 w-4" />
            <span className="text-sm font-semibold">Niyol</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Formulari Niyol (cartacei e digitali) e formulari Multyproget in cui Niyol è trasportatore.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SEZIONI_NIYOL.map(({ label, href, icon: Icon }) => (
            <Button key={href} variant="outline" size="sm" className="gap-2 border-cyan-500/30" onClick={() => navigate(href)}>
              <Icon className="h-4 w-4" /> {label}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="formulari" className="space-y-4">
        <TabsList className="bg-card/60 border border-border/30 p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="formulari" className="gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
            <FileText className="h-4 w-4" /> Formulari Niyol
          </TabsTrigger>
          <TabsTrigger value="nuovo-fir" className="gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
            <Plus className="h-4 w-4" /> Nuovo FIR Niyol
          </TabsTrigger>
          <TabsTrigger value="fir-cartaceo" className="gap-2 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            <Printer className="h-4 w-4" /> FIR Cartaceo Niyol
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
            <MNFIRFormComplete tenantId={NIYOL_TENANT_ID} mnContext="niyol" enableFatturazione creationMode />
          </div>
        </TabsContent>

        <TabsContent value="fir-cartaceo">
          <div className="space-y-4 p-4 rounded-2xl bg-card/60 border border-amber-500/20">
            <NuovoFirCartaceoBox tenantId={NIYOL_TENANT_ID} mnContext="niyol" />
            <RentriFirCartaceiPanel tenantId={NIYOL_TENANT_ID} showConferma={false} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
