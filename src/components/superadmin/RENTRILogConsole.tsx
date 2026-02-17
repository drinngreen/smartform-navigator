import { useState, useEffect, useSyncExternalStore } from "react";
import { getLogs, subscribeToLogs, type RENTRILogEntry } from "@/lib/rentriSuperApi";
import { Terminal, CheckCircle, XCircle, Download } from "lucide-react";

function useRENTRILogs() {
  return useSyncExternalStore(subscribeToLogs, getLogs, getLogs);
}

export function RENTRILogConsole() {
  const logs = useRENTRILogs();

  const downloadArtifact = (entry: RENTRILogEntry, type: "pdf" | "xml") => {
    const data = entry.response;
    const content = type === "pdf" ? data?.pdf : data?.xfir || data?.xml;
    if (!content) { return; }
    // Assume base64
    try {
      const binary = atob(content);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: type === "pdf" ? "application/pdf" : "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fir_${entry.tenant}_${Date.now()}.${type}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
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

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <h3 className="text-lg font-display text-foreground flex items-center gap-2 mb-4">
        <Terminal size={20} /> Console Log Operazioni RENTRI
      </h3>
      <div className="max-h-96 overflow-y-auto space-y-2 font-mono text-xs">
        {logs.length === 0 && <p className="text-muted-foreground">Nessuna operazione registrata</p>}
        {logs.map((entry) => (
          <div key={entry.id} className={`p-3 rounded-lg border ${entry.success ? "border-green-800/30 bg-green-950/20" : "border-red-800/30 bg-red-950/20"}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {entry.success ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-red-400" />}
                <span className="text-foreground font-semibold">{entry.endpoint}</span>
                <span className="text-muted-foreground">[{entry.tenant}]</span>
                <span className={entry.success ? "text-green-400" : "text-red-400"}>HTTP {entry.status}</span>
              </div>
              <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</span>
            </div>
            <pre className="text-muted-foreground whitespace-pre-wrap break-all max-h-20 overflow-hidden">{JSON.stringify(entry.response, null, 1)}</pre>
            {entry.success && (
              <div className="flex gap-2 mt-2">
                {(entry.response?.pdf) && (
                  <button onClick={() => downloadArtifact(entry, "pdf")} className="flex items-center gap-1 px-2 py-1 rounded bg-secondary/50 text-foreground hover:bg-secondary text-xs">
                    <Download size={12} /> PDF
                  </button>
                )}
                {(entry.response?.xfir || entry.response?.xml) && (
                  <button onClick={() => downloadArtifact(entry, "xml")} className="flex items-center gap-1 px-2 py-1 rounded bg-secondary/50 text-foreground hover:bg-secondary text-xs">
                    <Download size={12} /> xFIR
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
