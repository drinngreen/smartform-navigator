import { useNavigate, useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { AutorizzazioniModule } from "@/components/autorizzazioni/AutorizzazioniModule";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function MNAutorizzazioniPage() {
  const navigate = useNavigate();
  const { context } = useParams<{ context: string }>();

  return (
    <MNAdminLayout
      title="📜 Autorizzazioni Multyproget & Niyol"
      subtitle="Archivio consultabile di albi, autorizzazioni impianto e iscrizioni, con AI dedicata sui documenti"
    >
      <div className="mb-4">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => navigate(`/mn/admin/${context ?? "dev-multyproget"}`)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla dashboard
        </Button>
      </div>
      <AutorizzazioniModule />
    </MNAdminLayout>
  );
}
