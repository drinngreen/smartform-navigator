import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Warehouse,
  Truck,
  BookOpen,
  UserCheck,
  BookUser,
  FileText,
  Receipt,
  Factory,
  Database,
  PenTool,
  Users,
  Globe,
  Send,
  HelpCircle,
} from "lucide-react";
import logoDragon from "@/assets/logo-dragon.png";
import { DevImpiantoModule } from "@/components/multynijol/dev/DevImpiantoModule";
import { DevContoProprioModule } from "@/components/multynijol/dev/DevContoProprioModule";
import { DevIntermediarioModule } from "@/components/multynijol/dev/DevIntermediarioModule";
import { DevRegistroGeneraleModule } from "@/components/multynijol/dev/DevRegistroGeneraleModule";
import { DevInviiRentriModule } from "@/components/multynijol/dev/DevInviiRentriModule";
import { DevContattiModule } from "@/components/multynijol/dev/DevContattiModule";
import { DevPrivatiModule } from "@/components/multynijol/dev/DevPrivatiModule";
import { DevRicevuteModule } from "@/components/multynijol/dev/DevRicevuteModule";
import { AdminAreeRiservateImpianti } from "@/components/multynijol/AdminAreeRiservateImpianti";
import { DevCERPreferitiModule } from "@/components/multynijol/dev/DevCERPreferitiModule";
import { DevGestioneFIRModule } from "@/components/multynijol/dev/DevGestioneFIRModule";
import { DevFirmaDigitaleModule } from "@/components/multynijol/dev/DevFirmaDigitaleModule";
import { DevPersonaleModule } from "@/components/multynijol/dev/DevPersonaleModule";
import { DevMagazzinoDevModule } from "@/components/multynijol/dev/DevMagazzinoDevModule";

import { DevNiyolModule } from "@/components/multynijol/dev/DevNiyolModule";
import { FatturazioneModule } from "@/components/fatturazione/FatturazioneModule";
import { DevMudExportModule } from "@/components/multynijol/dev/DevMudExportModule";
import { DevDdtModule } from "@/components/multynijol/dev/DevDdtModule";
import { useAuth } from "@/hooks/useAuth";
import { Euro, FileSpreadsheet, ClipboardList } from "lucide-react";

export default function MNDevDashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Persisted tab + sub-tab via URL params (so reload keeps the user where they were)
  const [tab, setTab] = useState<string>(searchParams.get("tab") || "impianto");
  const [registriSub, setRegistriSub] = useState<string>(searchParams.get("sub") || "intermediario");

  // Sync state -> URL (replace, no history pollution)
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    if (tab === "registri") next.set("sub", registriSub);
    else next.delete("sub");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, registriSub]);

  // React to back/forward URL changes
  useEffect(() => {
    const t = searchParams.get("tab");
    const s = searchParams.get("sub");
    if (t && t !== tab) setTab(t);
    if (s && s !== registriSub) setRegistriSub(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <MNAdminLayout title="🧪 Centro di Comando — Sviluppo" subtitle="Multyproget · Versione Operativa">

      {/* Link rapidi in testa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => navigate("/mn/admin/dev-multyproget/modulo-alternativo")}
          className="flex items-center gap-3 px-5 py-4 rounded-xl border border-amber-500/30 bg-card hover:bg-amber-500/10 transition-all text-left"
        >
          <FileText size={20} className="text-amber-400" />
          <div>
            <div className="font-semibold text-sm text-amber-300">Modulo Alternativo FIR</div>
            <div className="text-xs text-muted-foreground">Vista sperimentale del formulario</div>
          </div>
        </button>

        <button
          onClick={() => navigate("/mn/admin/dev-multyproget/guida")}
          className="flex items-center gap-3 px-5 py-4 rounded-xl border border-emerald-500/30 bg-card hover:bg-emerald-500/10 transition-all text-left"
        >
          <HelpCircle size={20} className="text-emerald-400" />
          <div>
            <div className="font-semibold text-sm text-emerald-300">Guida Dev Multy</div>
            <div className="text-xs text-muted-foreground">Istruzioni operative complete di ogni modulo</div>
          </div>
        </button>

        <button
          onClick={() => navigate("/mn/admin/dev-multyproget/rentri-console")}
          className="flex items-center gap-3 px-5 py-4 rounded-xl border border-cyan-500/30 bg-card hover:bg-cyan-500/10 transition-all text-left"
        >
          <Radar size={20} className="text-cyan-400" />
          <div>
            <div className="font-semibold text-sm text-cyan-300">Console RENTRI</div>
            <div className="text-xs text-muted-foreground">Stato bridge, numeri FIR, invio registri, Dark Lemon</div>
          </div>
        </button>

      </div>


      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-card/60 border border-border/30 backdrop-blur-xl p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="impianto" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Warehouse className="h-4 w-4" />Impianto
          </TabsTrigger>
          <TabsTrigger value="niyol" className="gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
            <Truck className="h-4 w-4" />Niyol
          </TabsTrigger>

          <TabsTrigger value="magazzino-dev" className="gap-2 data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
            <img src={logoDragon} alt="Dragon" className="h-5 w-5" />Magazzino Dev
          </TabsTrigger>
          <TabsTrigger value="conto-proprio" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Truck className="h-4 w-4" />Conto Proprio
          </TabsTrigger>
          <TabsTrigger value="registri" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <BookOpen className="h-4 w-4" />Registri
          </TabsTrigger>
          <TabsTrigger value="contatti" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <BookUser className="h-4 w-4" />Contatti
          </TabsTrigger>
          <TabsTrigger value="privati" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <UserCheck className="h-4 w-4" />Privati
          </TabsTrigger>
          <TabsTrigger value="ricevute" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <Receipt className="h-4 w-4" />Ricevute
          </TabsTrigger>
          <TabsTrigger value="aree-riservate" className="gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
            <Factory className="h-4 w-4" />Aree Riservate
          </TabsTrigger>
          <TabsTrigger value="cer-preferiti" className="gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
            <FileText className="h-4 w-4" />CER Preferiti
          </TabsTrigger>
          <TabsTrigger value="gestione-fir" className="gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            <Database className="h-4 w-4" />Gestione FIR
          </TabsTrigger>
          <TabsTrigger value="firma-digitale" className="gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            <PenTool className="h-4 w-4" />Firma Digitale
          </TabsTrigger>
          <TabsTrigger value="fatturazione" className="gap-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300">
            <Euro className="h-4 w-4" />Fatturazione
          </TabsTrigger>
          <TabsTrigger value="personale" className="gap-2 data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
            <Users className="h-4 w-4" />Personale
          </TabsTrigger>
          <TabsTrigger value="mud" className="gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
            <FileSpreadsheet className="h-4 w-4" />MUD
          </TabsTrigger>
          <TabsTrigger value="ddt" className="gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
            <ClipboardList className="h-4 w-4" />DDT
          </TabsTrigger>
        </TabsList>

        <TabsContent value="impianto"><DevImpiantoModule /></TabsContent>
        <TabsContent value="niyol"><DevNiyolModule /></TabsContent>
        <TabsContent value="conto-proprio"><DevContoProprioModule /></TabsContent>


        <TabsContent value="registri">
          <Tabs value={registriSub} onValueChange={setRegistriSub} className="space-y-4">
            <TabsList className="bg-card/40 border border-border/30 p-1">
              <TabsTrigger value="intermediario" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                <Globe className="h-4 w-4" />Intermediario
              </TabsTrigger>
              <TabsTrigger value="generale" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                <BookOpen className="h-4 w-4" />Registro Generale
              </TabsTrigger>
              <TabsTrigger value="invii-rentri" className="gap-2 data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                <Send className="h-4 w-4" />Invii al RENTRI
              </TabsTrigger>
            </TabsList>
            <TabsContent value="intermediario"><DevIntermediarioModule /></TabsContent>
            <TabsContent value="generale"><DevRegistroGeneraleModule /></TabsContent>
            <TabsContent value="invii-rentri"><DevInviiRentriModule /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="contatti"><DevContattiModule /></TabsContent>
        <TabsContent value="privati"><DevPrivatiModule /></TabsContent>
        <TabsContent value="ricevute"><DevRicevuteModule /></TabsContent>
        <TabsContent value="aree-riservate"><AdminAreeRiservateImpianti tenantFilter="77ec9a3d-602e-438f-97bf-1c69abd8f691" /></TabsContent>
        <TabsContent value="cer-preferiti"><DevCERPreferitiModule /></TabsContent>
        <TabsContent value="gestione-fir"><DevGestioneFIRModule /></TabsContent>
        <TabsContent value="firma-digitale"><DevFirmaDigitaleModule /></TabsContent>
        <TabsContent value="personale"><DevPersonaleModule /></TabsContent>
        <TabsContent value="magazzino-dev"><DevMagazzinoDevModule /></TabsContent>
        <TabsContent value="fatturazione"><FatturazioneModule tenantId={profile?.tenant_id || undefined} /></TabsContent>
        <TabsContent value="mud"><DevMudExportModule /></TabsContent>
        <TabsContent value="ddt"><DevDdtModule /></TabsContent>
      </Tabs>
    </MNAdminLayout>
  );
}
