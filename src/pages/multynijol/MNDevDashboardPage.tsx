import { useNavigate } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Warehouse, Truck, Users, Globe, UserCheck, BookUser, CreditCard, FileText } from "lucide-react";
import { DevImpiantoModule } from "@/components/multynijol/dev/DevImpiantoModule";
import { DevContoProprioModule } from "@/components/multynijol/dev/DevContoProprioModule";
import { DevIntermediarioModule } from "@/components/multynijol/dev/DevIntermediarioModule";
import { DevContattiModule } from "@/components/multynijol/dev/DevContattiModule";
import { DevPrivatiModule } from "@/components/multynijol/dev/DevPrivatiModule";

export default function MNDevDashboardPage() {
  const navigate = useNavigate();

  return (
    <MNAdminLayout title="🧪 Centro di Comando — Sviluppo" subtitle="Multyproget · Versione Operativa">
      {/* Link Modulo Alternativo */}
      <button onClick={() => navigate("/mn/admin/dev/modulo-alternativo")}
        className="w-full flex items-center gap-3 px-5 py-4 mb-4 rounded-xl border border-amber-500/30 bg-card hover:bg-amber-500/10 transition-all text-left">
        <FileText size={20} className="text-amber-400" />
        <div>
          <div className="font-semibold text-sm text-amber-300">Modulo Alternativo FIR</div>
          <div className="text-xs text-muted-foreground">Vista sperimentale del formulario</div>
        </div>
      </button>

      <Tabs defaultValue="impianto" className="space-y-4">
        <TabsList className="bg-card/60 border border-border/30 backdrop-blur-xl p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="impianto" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Warehouse className="h-4 w-4" />
            Impianto
          </TabsTrigger>
          <TabsTrigger value="conto-proprio" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Truck className="h-4 w-4" />
            Conto Proprio
          </TabsTrigger>
          <TabsTrigger value="intermediario" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Globe className="h-4 w-4" />
            Intermediario
          </TabsTrigger>
          <TabsTrigger value="contatti" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <BookUser className="h-4 w-4" />
            Contatti
          </TabsTrigger>
          <TabsTrigger value="privati" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <UserCheck className="h-4 w-4" />
            Privati
          </TabsTrigger>
        </TabsList>

        <TabsContent value="impianto">
          <DevImpiantoModule />
        </TabsContent>
        <TabsContent value="conto-proprio">
          <DevContoProprioModule />
        </TabsContent>
        <TabsContent value="intermediario">
          <DevIntermediarioModule />
        </TabsContent>
        <TabsContent value="contatti">
          <DevContattiModule />
        </TabsContent>
        <TabsContent value="privati">
          <DevPrivatiModule />
        </TabsContent>
      </Tabs>
    </MNAdminLayout>
  );
}
