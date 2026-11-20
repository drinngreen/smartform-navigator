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
import { Euro, FileSpreadsheet, ClipboardList, Radar, Newspaper, ShieldCheck, ChevronDown, ChevronRight } from "lucide-react";


/** Voci del menu laterale del Centro di Comando — Sviluppo. */
const VOCI_MENU = [
    { value: "vista-veloce", label: "Vista veloce", Icon: FileText, cls: "data-[state=active]:bg-primary/20 data-[state=active]:text-primary" },
    { value: "impianto", label: "Impianto", Icon: Warehouse, cls: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" },
    { value: "carico-lavorazione", label: "Carico di lavorazione", Icon: PackagePlus, cls: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" },
    { value: "niyol", label: "Niyol", Icon: Truck, cls: "data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300" },
    { value: "conto-proprio", label: "Conto Proprio", Icon: Truck, cls: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" },
    { value: "registri", label: "Registri", Icon: BookOpen, cls: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" },
    { value: "contatti", label: "Contatti", Icon: BookUser, cls: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" },
    { value: "privati", label: "Privati", Icon: UserCheck, cls: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" },
    { value: "ricevute", label: "Ricevute", Icon: Receipt, cls: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" },
    { value: "aree-riservate", label: "Aree Riservate", Icon: Factory, cls: "data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400" },
    { value: "cer-preferiti", label: "CER Preferiti", Icon: FileText, cls: "data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400" },
    { value: "gestione-fir", label: "Gestione FIR", Icon: Database, cls: "data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400" },
    { value: "firma-digitale", label: "Firma Digitale", Icon: PenTool, cls: "data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400" },
    { value: "fatturazione", label: "Fatturazione", Icon: Euro, cls: "data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300" },
    { value: "personale", label: "Personale", Icon: Users, cls: "data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400" },
    { value: "mud", label: "MUD", Icon: FileSpreadsheet, cls: "data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400" },
    { value: "ddt", label: "DDT", Icon: ClipboardList, cls: "data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400" },
    { value: "confronto-elenchi", label: "Confronto elenchi", Icon: FileSpreadsheet, cls: "data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-300" },
    { value: "backup-export", label: "Backup completo", Icon: Database, cls: "data-[state=active]:bg-primary/20 data-[state=active]:text-primary" },
];
const SOTTO_REGISTRI = [
  { value: "intermediario", label: "Intermediario", Icon: Globe },
  { value: "generale", label: "Registro Generale", Icon: BookOpen },
  { value: "invii-rentri", label: "Invii al RENTRI", Icon: Send },
];

export default function MNDevDashboardPage() {
  const selezione = useSelezioneElenco();
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
        <aside className="w-full lg:w-60 shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <TabsList className="flex h-auto w-full flex-col items-stretch gap-0.5 bg-card/60 border border-border/30 backdrop-blur-xl p-2">
            {VOCI_MENU.map(({ value, label, Icon, cls }) => (
              <div key={value}>
                <TabsTrigger value={value} className={`w-full justify-start gap-2 px-3 py-2 ${cls}`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {value === "registri" && (tab === "registri" ? <ChevronDown className="h-3.5 w-3.5 opacity-70" /> : <ChevronRight className="h-3.5 w-3.5 opacity-70" />)}
                </TabsTrigger>
                {value === "registri" && tab === "registri" && (
                  <div className="ml-5 mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-emerald-500/30 pl-2">
                    {SOTTO_REGISTRI.map((sv) => (
                      <button
                        key={sv.value}
                        type="button"
                        onClick={() => handleRegistriSubChange(sv.value)}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${registriSub === sv.value ? "bg-emerald-500/20 text-emerald-300" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"}`}
                      >
                        <sv.Icon className="h-3.5 w-3.5" />{sv.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </TabsList>
        </aside>

        <div className="flex-1 min-w-0 w-full space-y-4">
      <DevPulsantieraPreferiti context="dev-multyproget" />

      {/* Link rapidi in testa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
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
