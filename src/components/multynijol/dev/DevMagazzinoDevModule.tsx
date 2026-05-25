import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, BookOpen, ClipboardList } from "lucide-react";
import { DevGiacenzeModule } from "./DevGiacenzeModule";
import { DevRegistroGeneraleModule } from "./DevRegistroGeneraleModule";
import { DevRegistroCaricoScaricoModule } from "./DevRegistroCaricoScaricoModule";

export function DevMagazzinoDevModule() {
  const [tab, setTab] = useState("giacenze");

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-emerald-300">🐉 Dragon — Magazzino & Registro</h3>
        <p className="text-xs text-muted-foreground">
          Gestione integrata: giacenze in tempo reale, registro cronologico e carico/scarico guidato
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-card/40 border border-border/30">
          <TabsTrigger value="giacenze" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <Package className="h-4 w-4" /> Giacenze
          </TabsTrigger>
          <TabsTrigger value="registro" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <BookOpen className="h-4 w-4" /> Registro Generale
          </TabsTrigger>
          <TabsTrigger value="carico-scarico" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <ClipboardList className="h-4 w-4" /> Carico / Scarico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="giacenze" className="mt-4"><DevGiacenzeModule /></TabsContent>
        <TabsContent value="registro" className="mt-4"><DevRegistroGeneraleModule /></TabsContent>
        <TabsContent value="carico-scarico" className="mt-4"><DevRegistroCaricoScaricoModule /></TabsContent>
      </Tabs>
    </div>
  );
}
