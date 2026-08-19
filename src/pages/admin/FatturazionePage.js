import { jsx as _jsx } from "react/jsx-runtime";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { FatturazioneModule } from "@/components/erp/FatturazioneModule";
import { useAuth } from "@/hooks/useAuth";
export default function FatturazionePage() {
    const { profile } = useAuth();
    return (_jsx(AdminLayout, { title: "Fatturazione", subtitle: "Mini-ERP Contabile", children: _jsx(FatturazioneModule, { tenantId: profile?.tenant_id || undefined }) }));
}
