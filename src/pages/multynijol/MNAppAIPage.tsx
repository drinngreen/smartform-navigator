import { useLocation, useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { MNBottomNav } from "@/components/layout/MNBottomNav";
import { MobileShell } from "@/components/layout/MobileShell";
import { DarkLemonMNChat } from "@/components/ai/DarkLemonMNChat";
import { Button } from "@/components/ui/button";
import logoDragon from "@/assets/logo-dragon.png";

export default function MNAppAIPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const context = location.pathname.includes("/niyol") ? "niyol" : "multyproget";
  const basePath = `/mn/app/${context}`;

  return (
    <MobileShell>
      <div className="flex items-center gap-3 border-b border-border/30 px-4 py-3">
        <img src={logoDragon} alt="Dark Lemon" className="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg font-bold text-foreground">DARK LEMON</h1>
          <p className="text-[10px] font-mono uppercase text-muted-foreground">Formulario · Foto OCR · Cronologia</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(basePath)} className="gap-1.5">
          <FileText className="h-4 w-4" /> FIR
        </Button>
      </div>
      <div className="min-h-0 flex-1 px-2 py-2 pb-20">
        <DarkLemonMNChat context={context} surface="page" appMode defaultHistoryOpen />
      </div>
      <MNBottomNav basePath={basePath} />
    </MobileShell>
  );
}