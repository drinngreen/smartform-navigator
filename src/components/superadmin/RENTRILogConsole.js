import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSyncExternalStore } from "react";
import { getLogs, subscribeToLogs } from "@/lib/rentriSuperApi";
import { Terminal, CheckCircle, XCircle, Download } from "lucide-react";
function useRENTRILogs() {
    return useSyncExternalStore(subscribeToLogs, getLogs, getLogs);
}
export function RENTRILogConsole() {
    const logs = useRENTRILogs();
    const downloadArtifact = (entry, type) => {
        const data = entry.response;
        const content = type === "pdf" ? data?.pdf : data?.xfir || data?.xml;
        if (!content) {
            return;
        }
        // Assume base64
        try {
            const binary = atob(content);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++)
                bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: type === "pdf" ? "application/pdf" : "application/xml" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `fir_${entry.tenant}_${Date.now()}.${type}`;
            a.click();
            URL.revokeObjectURL(url);
        }
        catch {
            // Try as plain text
            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `fir_${entry.tenant}_${Date.now()}.${type}`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };
    return (_jsxs("div", { className: "bg-card rounded-xl p-6 border border-border", children: [_jsxs("h3", { className: "text-lg font-display text-foreground flex items-center gap-2 mb-4", children: [_jsx(Terminal, { size: 20 }), " Console Log Operazioni RENTRI"] }), _jsxs("div", { className: "max-h-96 overflow-y-auto space-y-2 font-mono text-xs", children: [logs.length === 0 && _jsx("p", { className: "text-muted-foreground", children: "Nessuna operazione registrata" }), logs.map((entry) => (_jsxs("div", { className: `p-3 rounded-lg border ${entry.success ? "border-green-800/30 bg-green-950/20" : "border-red-800/30 bg-red-950/20"}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [entry.success ? _jsx(CheckCircle, { size: 14, className: "text-green-400" }) : _jsx(XCircle, { size: 14, className: "text-red-400" }), _jsx("span", { className: "text-foreground font-semibold", children: entry.endpoint }), _jsxs("span", { className: "text-muted-foreground", children: ["[", entry.tenant, "]"] }), _jsxs("span", { className: entry.success ? "text-green-400" : "text-red-400", children: ["HTTP ", entry.status] })] }), _jsx("span", { className: "text-muted-foreground", children: new Date(entry.timestamp).toLocaleTimeString() })] }), _jsx("pre", { className: "text-muted-foreground whitespace-pre-wrap break-all max-h-20 overflow-hidden", children: JSON.stringify(entry.response, null, 1) }), entry.success && (_jsxs("div", { className: "flex gap-2 mt-2", children: [(entry.response?.pdf) && (_jsxs("button", { onClick: () => downloadArtifact(entry, "pdf"), className: "flex items-center gap-1 px-2 py-1 rounded bg-secondary/50 text-foreground hover:bg-secondary text-xs", children: [_jsx(Download, { size: 12 }), " PDF"] })), (entry.response?.xfir || entry.response?.xml) && (_jsxs("button", { onClick: () => downloadArtifact(entry, "xml"), className: "flex items-center gap-1 px-2 py-1 rounded bg-secondary/50 text-foreground hover:bg-secondary text-xs", children: [_jsx(Download, { size: 12 }), " xFIR"] }))] }))] }, entry.id)))] })] }));
}
