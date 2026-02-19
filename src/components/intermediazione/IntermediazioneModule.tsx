import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntermediariTab } from "./IntermediariTab";
import { IntermediazioniTab } from "./IntermediazioniTab";
import { RegistroIntermediarioTab } from "./RegistroIntermediarioTab";
import { ListiniTab } from "./ListiniTab";
import { ReportProvvigioniTab } from "./ReportProvvigioniTab";
import intermediazionIcon from "@/assets/intermediazione-icon.png";

export function IntermediazioneModule() {
  const [activeTab, setActiveTab] = useState("intermediazioni");

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="flex items-center gap-4 p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <img src={intermediazionIcon} alt="Intermediazione" className="h-16 w-16 rounded-xl" />
        <div>
          <h2 className="text-lg font-display text-foreground">Modulo Intermediazione</h2>
          <p className="text-sm text-muted-foreground">
            Gestione completa dell'intermediazione rifiuti — Cat. 8 Albo Gestori, contratti, provvigioni e registro cronologico.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/60 border border-border/30 backdrop-blur-xl">
          <TabsTrigger value="intermediazioni">Intermediazioni</TabsTrigger>
          <TabsTrigger value="intermediari">Anagrafica</TabsTrigger>
          <TabsTrigger value="registro">Registro</TabsTrigger>
          <TabsTrigger value="listini">Listini</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="intermediazioni">
          <IntermediazioniTab />
        </TabsContent>
        <TabsContent value="intermediari">
          <IntermediariTab />
        </TabsContent>
        <TabsContent value="registro">
          <RegistroIntermediarioTab />
        </TabsContent>
        <TabsContent value="listini">
          <ListiniTab />
        </TabsContent>
        <TabsContent value="report">
          <ReportProvvigioniTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
