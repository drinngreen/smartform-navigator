import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { NewsFeedModule } from "@/components/news/NewsFeedModule";

export default function MNNewsPage() {
  return (
    <MNAdminLayout
      title="📰 News Rifiuti & RENTRI"
      subtitle="Feed normativo e di settore aggregato da RENTRI, testate specializzate e news generaliste, con analista AI"
    >
      <NewsFeedModule />
    </MNAdminLayout>
  );
}
