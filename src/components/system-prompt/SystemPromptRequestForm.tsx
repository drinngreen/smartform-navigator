import { useState } from "react";
import { Send, Plus } from "lucide-react";
import { PROMPT_CATEGORIES, useSystemPromptRequests } from "@/hooks/useSystemPromptRequests";
import systemPromptIcon from "@/assets/system-prompt-icon.png";

interface Props {
  tenantLabel: string;
  tenantId: string | null;
  tenantName: string;
}

export function SystemPromptRequestForm({ tenantLabel, tenantId, tenantName }: Props) {
  const { requests, loading, createRequest, deleteRequest } = useSystemPromptRequests(tenantLabel);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category || !title.trim() || !content.trim()) return;
    setSubmitting(true);
    const ok = await createRequest({ tenant_id: tenantId, tenant_label: tenantLabel, category, title, content });
    if (ok) { setShowForm(false); setCategory(""); setTitle(""); setContent(""); }
    setSubmitting(false);
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "pending": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "reviewed": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "implemented": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "rejected": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-white/10 text-white/60 border-white/20";
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case "pending": return "In Attesa";
      case "reviewed": return "Visionato";
      case "implemented": return "Implementato";
      case "rejected": return "Rifiutato";
      default: return s;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <img src={systemPromptIcon} alt="System Prompt" className="h-14 w-14 rounded-xl" />
        <div>
          <h2 className="text-white font-display text-xl tracking-wider">SYSTEM PROMPT</h2>
          <p className="text-white/40 text-sm">Richieste configurazione AI — {tenantName}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuova Richiesta
        </button>
      </div>

      {/* New request form */}
      {showForm && (
        <div className="rounded-2xl border border-amber-500/20 bg-[hsl(222,47%,8%)] p-6 space-y-4">
          <h3 className="text-white/80 text-sm font-semibold mb-3">📝 Nuova richiesta per l'agente AI</h3>

          {/* Category selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PROMPT_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`p-3 rounded-xl border text-left transition-all text-xs ${
                  category === cat.value
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                    : "border-white/10 bg-white/5 text-white/50 hover:border-white/20"
                }`}
              >
                <span className="text-sm">{cat.label.split(" ")[0]}</span>
                <p className="mt-1 text-[10px] opacity-70">{cat.desc}</p>
              </button>
            ))}
          </div>

          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titolo della richiesta..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500/40"
          />

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Descrivi in dettaglio cosa vuoi che l'agente AI faccia, come deve comportarsi, quali dati deve gestire, quali API integrare..."
            rows={6}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500/40 resize-none"
          />

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-white/40 text-sm hover:text-white/60 transition-colors">
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={!category || !title.trim() || !content.trim() || submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/30 disabled:opacity-30 transition-colors"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Invio..." : "Invia Richiesta"}
            </button>
          </div>
        </div>
      )}

      {/* Existing requests */}
      {loading ? (
        <p className="text-white/30 text-sm text-center py-8">Caricamento...</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <img src={systemPromptIcon} alt="" className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-white/30 text-sm">Nessuna richiesta inviata ancora.</p>
          <p className="text-white/20 text-xs mt-1">Clicca "Nuova Richiesta" per iniziare</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const cat = PROMPT_CATEGORIES.find((c) => c.value === req.category);
            return (
              <div key={req.id} className="rounded-xl border border-white/10 bg-[hsl(222,47%,8%)] p-4 hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{cat?.label.split(" ")[0]}</span>
                      <span className="text-white text-sm font-medium truncate">{req.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getStatusColor(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs line-clamp-2">{req.content}</p>
                    {req.admin_notes && (
                      <p className="mt-2 text-cyan-400/70 text-xs border-l-2 border-cyan-500/30 pl-2">
                        💬 {req.admin_notes}
                      </p>
                    )}
                    <p className="text-white/20 text-[10px] mt-2">{new Date(req.created_at).toLocaleDateString("it-IT")}</p>
                  </div>
                  {req.status === "pending" && (
                    <button
                      onClick={() => deleteRequest(req.id)}
                      className="text-red-400/50 hover:text-red-400 text-xs transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
