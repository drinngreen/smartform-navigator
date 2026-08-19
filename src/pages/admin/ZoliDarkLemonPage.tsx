import { AdminLayout } from "@/components/layout/AdminLayout";
import { DarkLemonChat } from "@/components/ai/DarkLemonChat";
import { Button } from "@/components/ui/button";
import { PanelRightOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";

export default function ZoliDarkLemonPage() {
  const navigate = useNavigate();
  const setSidePanel = useZoliDarkLemonWidgetStore((s) => s.setSidePanel);

  const backToSide = () => {
    setSidePanel(true);
    navigate(-1);
  };

  return (
    <AdminLayout title="Dark Lemon AI" subtitle="Assistente AI Aziendale">
      <div className="flex justify-end mb-3">
        <Button variant="outline" size="sm" onClick={backToSide}>
          <PanelRightOpen className="w-4 h-4 mr-2" />
          Torna a vista laterale
        </Button>
      </div>
      <DarkLemonChat />
    </AdminLayout>
  );
}
