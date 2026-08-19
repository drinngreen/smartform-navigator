import { jsx as _jsx } from "react/jsx-runtime";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { IntermediazioneModule } from "@/components/intermediazione/IntermediazioneModule";
export default function MNIntermediazionePage() {
    return (_jsx(MNAdminLayout, { title: "Intermediazione", subtitle: "Gestione intermediazione rifiuti Cat. 8", children: _jsx(IntermediazioneModule, {}) }));
}
