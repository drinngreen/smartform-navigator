import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntermediariTab } from "./IntermediariTab";
import { IntermediazioniTab } from "./IntermediazioniTab";
import { RegistroIntermediarioTab } from "./RegistroIntermediarioTab";
import { ListiniTab } from "./ListiniTab";
import { ReportProvvigioniTab } from "./ReportProvvigioniTab";
import intermediazionIcon from "@/assets/intermediazione-icon.png";
export function IntermediazioneModule() {
    const [activeTab, setActiveTab] = useState("intermediazioni");
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center gap-4 p-6 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx("img", { src: intermediazionIcon, alt: "Intermediazione", className: "h-16 w-16 rounded-xl" }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-display text-foreground", children: "Modulo Intermediazione" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Gestione completa dell'intermediazione rifiuti \u2014 Cat. 8 Albo Gestori, contratti, provvigioni e registro cronologico." })] })] }), _jsxs(Tabs, { value: activeTab, onValueChange: setActiveTab, children: [_jsxs(TabsList, { className: "bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx(TabsTrigger, { value: "intermediazioni", children: "Intermediazioni" }), _jsx(TabsTrigger, { value: "intermediari", children: "Anagrafica" }), _jsx(TabsTrigger, { value: "registro", children: "Registro" }), _jsx(TabsTrigger, { value: "listini", children: "Listini" }), _jsx(TabsTrigger, { value: "report", children: "Report" })] }), _jsx(TabsContent, { value: "intermediazioni", children: _jsx(IntermediazioniTab, {}) }), _jsx(TabsContent, { value: "intermediari", children: _jsx(IntermediariTab, {}) }), _jsx(TabsContent, { value: "registro", children: _jsx(RegistroIntermediarioTab, {}) }), _jsx(TabsContent, { value: "listini", children: _jsx(ListiniTab, {}) }), _jsx(TabsContent, { value: "report", children: _jsx(ReportProvvigioniTab, {}) })] })] }));
}
