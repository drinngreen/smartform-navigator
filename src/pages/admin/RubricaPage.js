import { jsx as _jsx } from "react/jsx-runtime";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { RubricaTab } from "@/components/comunicazioni/RubricaTab";
export default function RubricaPage() {
    return (_jsx(AdminLayout, { title: "Rubrica", subtitle: "Contatti aziendali", children: _jsx("div", { className: "p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: _jsx(RubricaTab, { basePath: "/admin" }) }) }));
}
