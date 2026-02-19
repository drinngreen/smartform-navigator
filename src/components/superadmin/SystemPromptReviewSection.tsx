import { useState } from "react";
import { ChevronDown, ChevronUp, Check, X, Eye, MessageSquare } from "lucide-react";
import { useSystemPromptRequests, PROMPT_CATEGORIES, SystemPromptRequest } from "@/hooks/useSystemPromptRequests";
import systemPromptIcon from "@/assets/system-prompt-icon.png";

const TENANTS = [
  { label: "global", name: "Global Reco", color: "bg-emerald-500" },
  { label: "multyproget", name: "Multyproget", color: "bg-orange-500" },
  { label: "niyol", name: "Niyol", color: "bg-cyan-500" },
];

export function SystemPromptReviewSection() {
  const { requests, loading, updateStatus } = useSystemPromptRequests();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? requests : requests.filter((r) => r.tenant_label === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const handleAction = async (req: SystemPromptRequest, action: string) => {
    await updateStatus(req.id, action, noteInput || undefined);
    setNoteInput("");
    setExpandedId(null);
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "pending": return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] border border-amber-500/30">In Attesa</span>;
      case "reviewed": return <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] border border-blue-500/30">Visionato</span>;
      case "implemented": return <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] border border-green-500/30">Implementato</span>;
      case "rejected": return <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] border border-red-500/30">Rifiutato</span>;
      default: return null;
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <img src={systemPromptIcon} alt="" className="h-10 w-10 rounded-xl" />
        <div>
          <h2 className="font-display text-lg tracking-wider">SYSTEM PROMPT REQUESTS</h2>
          <p className="text-muted-foreground text-xs">
            {pendingCount > 0 ? `${pendingCount} richieste in attesa` : "Tutte le richieste gestite"}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${filter === "all" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-foreground"}`}
        >
          Tutti ({requests.length})
        </button>
        {TENANTS.map((t) => {
          const count = requests.filter((r) => r.tenant_label === t.label).length;
          return (
            <button
              key={t.label}
              onClick={() => setFilter(t.label)}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${filter === t.label ? "bg-white/10 text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span className={`w-2 h-2 rounded-full ${t.color}`} />
              {t.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Requests list */}
      {loading ? (
        <p className="text-muted-foreground text-sm text-center py-8">Caricamento...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">Nessuna richiesta</p>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filtered.map((req) => {
            const cat = PROMPT_CATEGORIES.find((c) => c.value === req.category);
            const tenant = TENANTS.find((t) => t.label === req.tenant_label);
            const isExpanded = expandedId === req.id;

            return (
              <div key={req.id} className="rounded-xl border border-border bg-secondary/30 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/50 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${tenant?.color || "bg-gray-500"}`} />
                  <span className="text-sm shrink-0">{cat?.label.split(" ")[0]}</span>
                  <span className="text-sm font-medium flex-1 truncate">{req.title}</span>
                  {getStatusBadge(req.status)}
                  <span className="text-muted-foreground text-[10px] shrink-0">
                    {new Date(req.created_at).toLocaleDateString("it-IT")}
                  </span>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={`w-2 h-2 rounded-full ${tenant?.color}`} />
                      {tenant?.name} • {cat?.label}
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{req.content}</p>

                    {req.admin_notes && (
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
                        <p className="text-xs text-cyan-400">💬 Note: {req.admin_notes}</p>
                      </div>
                    )}

                    {/* Admin actions */}
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Aggiungi una nota (opzionale)..."
                        className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(req, "reviewed")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-500/20">
                          <Eye size={12} /> Visionato
                        </button>
                        <button onClick={() => handleAction(req, "implemented")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs hover:bg-green-500/20">
                          <Check size={12} /> Implementato
                        </button>
                        <button onClick={() => handleAction(req, "rejected")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/20">
                          <X size={12} /> Rifiuta
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
