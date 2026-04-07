import { jsx as _jsx } from "react/jsx-runtime";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { AdminAreeRiservateImpianti } from "@/components/multynijol/AdminAreeRiservateImpianti";
import { useParams } from "react-router-dom";
const CONTEXT_TENANT_MAP = {
    "multyproget": "77ec9a3d-a6d4-4235-8e68-1a6f345de57a",
    "dev-multyproget": "77ec9a3d-a6d4-4235-8e68-1a6f345de57a",
    "niyol": "819c783e-4ecf-4774-85b7-7e7a1c5848fa",
};
export default function MNAreeRiservateImpiantiPage() {
    const { context } = useParams();
    const tenantId = context ? CONTEXT_TENANT_MAP[context] : undefined;
    return (_jsx(MNAdminLayout, { title: "Aree Riservate Impianti", subtitle: "Gestione accessi impianti destinatari", children: _jsx(AdminAreeRiservateImpianti, { tenantFilter: tenantId }) }));
}
