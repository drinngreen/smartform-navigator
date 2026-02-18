import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, Calculator, BookOpen } from "lucide-react";
import { AnagraficheTab } from "./AnagraficheTab";
import { FattureVenditaTab } from "./FattureVenditaTab";
import { PianoContiTab } from "./PianoContiTab";
import { TabelleFiscaliTab } from "./TabelleFiscaliTab";

interface FatturazioneModuleProps {
  tenantId?: string;
}

export function FatturazioneModule({ tenantId }: FatturazioneModuleProps) {
  return (
    <Tabs defaultValue="fatture" className="space-y-4">
      <TabsList className="bg-card/60 border border-border/30 backdrop-blur-xl p-1 h-auto flex-wrap gap-1">
        <TabsTrigger value="fatture" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
          <FileText className="h-4 w-4" />
          Fatture Vendita
        </TabsTrigger>
        <TabsTrigger value="anagrafiche" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
          <Users className="h-4 w-4" />
          Anagrafiche
        </TabsTrigger>
        <TabsTrigger value="piano-conti" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
          <BookOpen className="h-4 w-4" />
          Piano dei Conti
        </TabsTrigger>
        <TabsTrigger value="tabelle" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
          <Calculator className="h-4 w-4" />
          Tabelle Fiscali
        </TabsTrigger>
      </TabsList>

      <TabsContent value="fatture">
        <FattureVenditaTab tenantId={tenantId} />
      </TabsContent>
      <TabsContent value="anagrafiche">
        <AnagraficheTab tenantId={tenantId} />
      </TabsContent>
      <TabsContent value="piano-conti">
        <PianoContiTab tenantId={tenantId} />
      </TabsContent>
      <TabsContent value="tabelle">
        <TabelleFiscaliTab tenantId={tenantId} />
      </TabsContent>
    </Tabs>
  );
}
