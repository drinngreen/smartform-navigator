import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, BookOpen, ClipboardList, Scissors, Layers, GitBranch, ShieldCheck } from "lucide-react";
import { DevGiacenzeModule } from "./DevGiacenzeModule";
import { DevRegistroGeneraleModule } from "./DevRegistroGeneraleModule";
import { DevRegistroCaricoScaricoModule } from "./DevRegistroCaricoScaricoModule";
import { DevSystemTestModule } from "./DevSystemTestModule";

export function DevMagazzinoDevModule() {
  const [tab, setTab] = useState("giacenze");
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-emerald-300">🐉 Dragon — Magazzino & Registro</h3>
        <p className="text-xs text-muted-foreground">
          Gestione integrata: giacenze in tempo reale, registro cronologico e carico/scarico guidato
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-card/40 border border-border/30 h-auto flex-wrap gap-1">
          <TabsTrigger value="giacenze" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <Package className="h-4 w-4" /> Giacenze
          </TabsTrigger>
          <TabsTrigger value="registro" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <BookOpen className="h-4 w-4" /> Registro Generale
          </TabsTrigger>
          <TabsTrigger value="carico-scarico" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <ClipboardList className="h-4 w-4" /> Carico / Scarico
          </TabsTrigger>
          <TabsTrigger value="cernita" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <Scissors className="h-4 w-4" /> Cernita
          </TabsTrigger>
          <TabsTrigger value="modelli-cernita" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <Layers className="h-4 w-4" /> Modelli Cernita
          </TabsTrigger>
          <TabsTrigger value="lotti" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <GitBranch className="h-4 w-4" /> Lotti & Rintraccia
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> Test di Sistema
          </TabsTrigger>
        </TabsList>


        <TabsContent value="giacenze" className="mt-4"><DevGiacenzeModule /></TabsContent>
        <TabsContent value="registro" className="mt-4"><DevRegistroGeneraleModule /></TabsContent>
        <TabsContent value="carico-scarico" className="mt-4"><DevRegistroCaricoScaricoModule /></TabsContent>
        <TabsContent value="cernita" className="mt-4">
          <div className="rounded-xl border border-border/30 bg-card/60 p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h4 className="font-semibold text-emerald-300 flex items-center gap-2"><Scissors className="h-4 w-4" /> Cernita materiali</h4>
              <p className="text-xs text-muted-foreground mt-1">Apri la lavorazione per scaricare il CER in ingresso e caricare i componenti in uscita.</p>
            </div>
            <button onClick={() => navigate("/mn/admin/dev-multyproget/dragon/cernite/batch")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Apri Cernita
            </button>
          </div>
        </TabsContent>
        <TabsContent value="modelli-cernita" className="mt-4">
          <div className="rounded-xl border border-border/30 bg-card/60 p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h4 className="font-semibold text-emerald-300 flex items-center gap-2"><Layers className="h-4 w-4" /> Modelli di cernita</h4>
              <p className="text-xs text-muted-foreground mt-1">Gestisci ricette e percentuali precompilate per le lavorazioni ricorrenti.</p>
            </div>
            <button onClick={() => navigate("/mn/admin/dev-multyproget/dragon/cernite/modelli")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Apri Modelli
            </button>
          </div>
        </TabsContent>
        <TabsContent value="lotti" className="mt-4">
          <div className="rounded-xl border border-border/30 bg-card/60 p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h4 className="font-semibold text-emerald-300 flex items-center gap-2"><GitBranch className="h-4 w-4" /> Lotti & Rintraccia</h4>
              <p className="text-xs text-muted-foreground mt-1">Dividi o accorpa i lotti e visualizza l'albero di tracciabilità completo.</p>
            </div>
            <button onClick={() => navigate("/mn/admin/dev-multyproget/dragon/lotti")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Apri Lotti
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
