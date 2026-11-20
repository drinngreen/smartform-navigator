import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelezioneElenco } from "@/hooks/useSelezioneElenco";
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
  PlayCircle,
  PackagePlus,
} from "lucide-react";
import { DevImpiantoModule } from "@/components/multynijol/dev/DevImpiantoModule";
import { OperazioniMagazzinoModule } from "@/components/multynijol/dev/OperazioniMagazzinoModule";
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
import { DevPulsantieraPreferiti } from "@/components/multynijol/dev/DevPulsantieraPreferiti";
import { DevConfrontoElenchiModule } from "@/components/multynijol/dev/DevConfrontoElenchiModule";


import { DevVistaVeloceModule } from "@/components/multynijol/dev/DevVistaVeloceModule";
import { DevNiyolModule } from "@/components/multynijol/dev/DevNiyolModule";
import { FatturazioneModule } from "@/components/fatturazione/FatturazioneModule";
import { DevMudExportModule } from "@/components/multynijol/dev/DevMudExportModule";
import { DevBackupExportModule } from "@/components/multynijol/dev/DevBackupExportModule";
import { DevInvioCopiaUnaTantumModule } from "@/components/multynijol/dev/DevInvioCopiaUnaTantumModule";
import { DevDdtModule } from "@/components/multynijol/dev/DevDdtModule";
import { useAuth } from "@/hooks/useAuth";
import { Euro, FileSpreadsheet, ClipboardList, Radar, Newspaper, ShieldCheck, ChevronDown, ChevronRight, PanelRightOpen, PanelRightClose } from "lucide-react";
import { DevMenuLaterale } from "@/components/multynijol/dev/DevMenuLaterale";


export default function MNDevDashboardPage() {
  const selezione = useSelezioneElenco();
  // Tendina «Guide e tutorial»: chiusa di default, ricorda l'ultima scelta
  const [guideAperte, setGuideAperte] = useState<boolean>(() => {
    try { return localStorage.getItem("dev-guide-aperte") === "1"; } catch { return false; }
  });
  const cambiaGuide = () => {
    setGuideAperte((v) => {
      try { localStorage.setItem("dev-guide-aperte", v ? "0" : "1"); } catch { /* ignora */ }
      return !v;
    });
  };
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // L'URL è l'unica fonte della scheda attiva: evita che uno stato precedente
  // annulli il click sui preferiti (in particolare Impianto → Giacenze).
  const tab = searchParams.get("tab") || "impianto";
  const registriSub = searchParams.get("sub") || "intermediario";

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    if (value !== "registri") next.delete("sub");
    setSearchParams(next, { replace: true });
  };

  const handleRegistriSubChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "registri");
    next.set("sub", value);
    setSearchParams(next, { replace: true });
  };

  return (
    <MNAdminLayout title="🧪 Centro di Comando — Sviluppo" subtitle="Multyproget · Versione Operativa">

      <Tabs value={tab} onValueChange={handleTabChange} orientation="vertical" className="flex flex-col lg:flex-row items-start gap-4">
        {/* Elenco fisso a sinistra; la sezione scelta si apre a destra (richiesta ufficio 20/11/2026) */}
        <DevMenuLaterale tab={tab} sub={registriSub} onTab={handleTabChange} onSub={handleRegistriSubChange} />

        <div className="flex-1 min-w-0 w-full space-y-4">
      <DevPulsantieraPreferiti context="dev-multyproget" />

      {/* Link rapidi raccolti nella tendina «Guide e tutorial» (richiesta ufficio 20/11/2026) */}
      <div className="mb-4 rounded-2xl border border-border/30 bg-card/60 p-3">
      <button
        type="button"
        onClick={cambiaGuide}
        aria-expanded={guideAperte}
        className="flex w-full items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <BookOpen size={14} className="text-emerald-400" /> Guide e tutorial
        <span className="ml-auto">{guideAperte ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
      </button>
      {guideAperte && (
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          {...selezione.propsVoce("/mn/admin/dev-multyproget/modulo-alternativo", () => navigate("/mn/admin/dev-multyproget/modulo-alternativo"))}
          className="flex items-center gap-3 px-5 py-4 rounded-xl border border-amber-500/30 bg-card hover:bg-amber-500/10 transition-all text-left"
        >
          <FileText size={20} className="text-amber-400" />
          <div>
            <div className="font-semibold text-sm text-amber-300">Modulo Alternativo FIR</div>
            <div className="text-xs text-muted-foreground">Vista sperimentale del formulario</div>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            {...selezione.propsVoce("/mn/admin/dev-multyproget/guida", () => navigate("/mn/admin/dev-multyproget/guida"))}
            className="flex items-center gap-3 px-4 py-4 rounded-xl border border-emerald-500/30 bg-card hover:bg-emerald-500/10 transition-all text-left"
          >
            <HelpCircle size={20} className="text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-sm text-emerald-300">Guida Dev Multy</div>
              <div className="text-xs text-muted-foreground">Istruzioni operative complete</div>
            </div>
          </button>

          <button
            {...selezione.propsVoce("/mn/admin/dev-multyproget/tutorial", () => navigate("/mn/admin/dev-multyproget/tutorial"))}
            className="flex items-center gap-3 px-4 py-4 rounded-xl border border-sky-500/30 bg-card hover:bg-sky-500/10 transition-all text-left"
          >
            <PlayCircle size={20} className="text-sky-400 shrink-0" />
            <div>
              <div className="font-semibold text-sm text-sky-300">Tutorial Interattivo</div>
              <div className="text-xs text-muted-foreground">18 capitoli con schermate e checklist</div>
            </div>
          </button>
        </div>

        <button
          {...selezione.propsVoce("/mn/admin/dev-multyproget/rentri-console", () => navigate("/mn/admin/dev-multyproget/rentri-console"))}
          className="flex items-center gap-3 px-5 py-4 rounded-xl border border-cyan-500/30 bg-card hover:bg-cyan-500/10 transition-all text-left"
        >
          <Radar size={20} className="text-cyan-400" />
          <div>
            <div className="font-semibold text-sm text-cyan-300">Console RENTRI</div>
            <div className="text-xs text-muted-foreground">Stato bridge, numeri FIR, invio registri, Dark Lemon</div>
          </div>
        </button>

        <button
          {...selezione.propsVoce("/mn/admin/dev-multyproget/centro-app-fir", () => navigate("/mn/admin/dev-multyproget/centro-app-fir"))}
          className="flex items-center gap-3 px-5 py-4 rounded-xl border border-violet-500/30 bg-card hover:bg-violet-500/10 transition-all text-left"
        >
          <Users size={20} className="text-violet-400" />
          <div>
            <div className="font-semibold text-sm text-violet-300">Centro App &amp; FIR</div>
            <div className="text-xs text-muted-foreground">Dipendenti Multyproget/Niyol con formulario sempre pronto</div>
          </div>
        </button>

        <button
          {...selezione.propsVoce("/mn/admin/dev-multyproget/news", () => navigate("/mn/admin/dev-multyproget/news"))}
          className="flex items-center gap-3 px-5 py-4 rounded-xl border border-sky-500/40 bg-card hover:bg-sky-500/10 transition-all text-left"
        >
          <Newspaper size={20} className="text-sky-400" />
          <div>
            <div className="font-semibold text-sm text-sky-300">News RENTRI &amp; Rifiuti</div>
            <div className="text-xs text-muted-foreground">Feed normative, decreti e AI analista sulle notizie</div>
          </div>
        </button>

        <button
          {...selezione.propsVoce("/mn/admin/dev-multyproget/autorizzazioni", () => navigate("/mn/admin/dev-multyproget/autorizzazioni"))}
          className="flex items-center gap-3 px-5 py-4 rounded-xl border border-amber-500/40 bg-card hover:bg-amber-500/10 transition-all text-left"
        >
          <ShieldCheck size={20} className="text-amber-400" />
          <div>
            <div className="font-semibold text-sm text-amber-300">Autorizzazioni Multy &amp; Niyol</div>
            <div className="text-xs text-muted-foreground">Albo, impianto, visure, PDF scaricabili e AUTHORITY AI</div>
          </div>
        </button>

      </div>
      )}
      </div>





        <TabsContent value="backup-export"><div className="space-y-6"><DevBackupExportModule /><DevInvioCopiaUnaTantumModule /></div></TabsContent>
        <TabsContent value="confronto-elenchi"><DevConfrontoElenchiModule /></TabsContent>
        <TabsContent value="vista-veloce"><DevVistaVeloceModule /></TabsContent>
        <TabsContent value="impianto"><DevImpiantoModule /></TabsContent>
        <TabsContent value="carico-lavorazione"><OperazioniMagazzinoModule soloCarico /></TabsContent>
        <TabsContent value="niyol"><DevNiyolModule /></TabsContent>
        <TabsContent value="conto-proprio"><DevContoProprioModule /></TabsContent>


        <TabsContent value="registri">
          <Tabs value={registriSub} onValueChange={handleRegistriSubChange} className="space-y-4">
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
        <TabsContent value="fatturazione"><FatturazioneModule tenantId={profile?.tenant_id || undefined} /></TabsContent>
        <TabsContent value="mud"><DevMudExportModule /></TabsContent>
        <TabsContent value="ddt"><DevDdtModule /></TabsContent>
        </div>
      </Tabs>
    </MNAdminLayout>
  );
}
