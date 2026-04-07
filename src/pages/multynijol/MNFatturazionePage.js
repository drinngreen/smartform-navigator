import { jsx as _jsx } from "react/jsx-runtime";
import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { FatturazioneModule } from "@/components/erp/FatturazioneModule";
import { useAuth } from "@/hooks/useAuth";
export default function MNFatturazionePage() {
    const { context } = useParams();
    const { profile } = useAuth();
    const contextLabel = context === "multyproget" ? "Multyproget" : "Niyol";
    return (_jsx(MNAdminLayout, { title: `Fatturazione — ${contextLabel}`, subtitle: "Mini-ERP Contabile", children: _jsx(FatturazioneModule, { tenantId: profile?.tenant_id || undefined }) }));
}
