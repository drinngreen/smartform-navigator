import { jsx as _jsx } from "react/jsx-runtime";
import { useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { RubricaTab } from "@/components/comunicazioni/RubricaTab";
export default function MNRubricaPage() {
    const { context } = useParams();
    return (_jsx(MNAdminLayout, { title: "Rubrica", subtitle: "Contatti aziendali", children: _jsx("div", { className: "p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: _jsx(RubricaTab, { basePath: `/mn/admin/${context}` }) }) }));
}
