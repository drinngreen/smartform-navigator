import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BookOpen, Package, FileText, Scissors, History, ExternalLink, Warehouse } from "lucide-react";

const PREFIX = "/mn/admin/dev-multyproget/dragon";

export function DevMagazzinoDevModule() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("registro");

  const sections = [
    { id: "registro", label: "Registro", icon: BookOpen, path: `${PREFIX}/registro` },
    { id: "magazzino", label: "Magazzino", icon: Package, path: `${PREFIX}/magazzino` },
    { id: "magazzini", label: "Archivio Magazzini", icon: Warehouse, path: `${PREFIX}/magazzini` },
    { id: "articoli", label: "Articoli CER", icon: FileText, path: `${PREFIX}/articoli` },
    { id: "cernite", label: "Cernite", icon: Scissors, path: `${PREFIX}/cernite/modelli` },
    { id: "audit", label: "Audit Trail", icon: History, path: `${PREFIX}/audit` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-emerald-300">🐉 Dragon — Magazzino Dev</h3>
          <p className="text-xs text-muted-foreground">
            Sistema integrato Registro &amp; Magazzino Rifiuti (tabelle dragon_*)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {sections.map((s) => (
          <Button
            key={s.id}
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4 border-border/40 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all"
            onClick={() => navigate(s.path)}
          >
            <s.icon className="h-6 w-6 text-emerald-400" />
            <span className="text-xs font-medium">{s.label}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </Button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground/60 italic">
        Clicca su una sezione per aprirla a pagina intera con tutte le funzionalità Dragon.
      </p>
    </div>
  );
}