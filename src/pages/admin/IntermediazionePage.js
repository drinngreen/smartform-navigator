import { jsx as _jsx } from "react/jsx-runtime";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { IntermediazioneModule } from "@/components/intermediazione/IntermediazioneModule";
export default function IntermediazionePage() {
    return (_jsx(AdminLayout, { title: "Intermediazione", subtitle: "Gestione intermediazione rifiuti Cat. 8", children: _jsx(IntermediazioneModule, {}) }));
}
