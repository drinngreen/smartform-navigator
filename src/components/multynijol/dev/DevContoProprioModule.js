import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DevLogisticaModule } from "./DevLogisticaModule";
import { FatturazioneModule } from "@/components/erp/FatturazioneModule";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, CreditCard } from "lucide-react";
export function DevContoProprioModule() {
    const { profile } = useAuth();
    return (_jsxs(Tabs, { defaultValue: "nuovo-fir", className: "space-y-4", children: [_jsxs(TabsList, { className: "bg-card/60 border border-border/30 p-1 h-auto flex-wrap gap-1", children: [_jsxs(TabsTrigger, { value: "nuovo-fir", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo FIR"] }), _jsxs(TabsTrigger, { value: "logistica", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(Search, { className: "h-4 w-4" }), " Logistica & Targa"] }), _jsxs(TabsTrigger, { value: "fatturazione", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(CreditCard, { className: "h-4 w-4" }), " Fatturazione"] })] }), _jsx(TabsContent, { value: "nuovo-fir", children: _jsx("div", { className: "p-4 rounded-2xl bg-card/60 border border-emerald-500/20", children: _jsx(MNFIRFormComplete, {}) }) }), _jsx(TabsContent, { value: "logistica", children: _jsx(DevLogisticaModule, {}) }), _jsx(TabsContent, { value: "fatturazione", children: _jsx("div", { className: "p-4 rounded-2xl bg-card/60 border border-emerald-500/20", children: _jsx(FatturazioneModule, { tenantId: profile?.tenant_id || undefined }) }) })] }));
}
