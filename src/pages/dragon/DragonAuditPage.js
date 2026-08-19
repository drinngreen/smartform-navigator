import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonAudit } from "@/hooks/dragon/useDragonAudit";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield } from "lucide-react";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";
const actionColors = {
    CREATE: "bg-emerald-500/20 text-emerald-300",
    UPDATE: "bg-blue-500/20 text-blue-300",
    SOFT_DELETE: "bg-rose-500/20 text-rose-300",
    RESTORE: "bg-violet-500/20 text-violet-300",
    CONFIRM: "bg-amber-500/20 text-amber-300",
    CANCEL: "bg-rose-500/20 text-rose-300",
    ADJUST: "bg-orange-500/20 text-orange-300",
};
export default function DragonAuditPage() {
    const { logs, isLoading } = useDragonAudit();
    return (_jsx(MNAdminLayout, { title: "Audit Trail", subtitle: "Dragon Rifiuti 2 \u2014 Cronologia eventi e tracciabilit\u00E0", children: _jsxs("div", { className: "space-y-4", children: [_jsx(DragonBackButton, {}), _jsxs("p", { className: "text-sm text-muted-foreground", children: [_jsx(Shield, { className: "h-4 w-4 inline mr-1" }), logs.length, " eventi registrati"] }), _jsx("div", { className: "bg-card/60 border border-border/30 rounded-xl overflow-hidden", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { children: "Data/Ora" }), _jsx(TableHead, { children: "Azione" }), _jsx(TableHead, { children: "Entit\u00E0" }), _jsx(TableHead, { children: "ID Entit\u00E0" }), _jsx(TableHead, { children: "Motivo" })] }) }), _jsx(TableBody, { children: isLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, className: "text-center py-12 text-muted-foreground", children: "Caricamento..." }) })) : logs.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, className: "text-center py-12 text-muted-foreground", children: "Nessun evento audit registrato" }) })) : (logs.map((log) => (_jsxs(TableRow, { className: "border-border/10", children: [_jsx(TableCell, { className: "text-sm", children: new Date(log.performed_at).toLocaleString("it-IT") }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: actionColors[log.action_type] || "", children: log.action_type }) }), _jsx(TableCell, { className: "text-sm", children: log.entity_type }), _jsx(TableCell, { className: "font-mono text-xs truncate max-w-[120px]", children: log.entity_id }), _jsx(TableCell, { className: "text-sm text-muted-foreground", children: log.reason || "—" })] }, log.id)))) })] }) })] }) }));
}
