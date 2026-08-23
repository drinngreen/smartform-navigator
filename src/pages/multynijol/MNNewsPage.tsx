import { useNavigate, useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { NewsFeedModule } from "@/components/news/NewsFeedModule";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function MNNewsPage() {
  const navigate = useNavigate();
  const { context } = useParams<{ context: string }>();

  return (
    <MNAdminLayout
      title="📰 News Rifiuti & RENTRI"
      subtitle="Feed normativo e di settore aggregato da RENTRI, testate specializzate e news generaliste, con analista AI"
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
      <NewsFeedModule />
    </MNAdminLayout>
  );
}
