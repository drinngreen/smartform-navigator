// Componente outbox email Global Reco (storico inviate)
import { useState } from "react";
import { useGlobalOutbox } from "@/hooks/useGlobalEmail";
import { format } from "date-fns";

export function GlobalEmailOutbox() {
  const [filter, setFilter] = useState<string>("");
  const { data: emails, isLoading } = useGlobalOutbox(filter || undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Email Inviate</h3>
        <div className="flex gap-1">
          {["", "automatica", "manuale"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                filter === cat ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "" ? "Tutte" : cat === "automatica" ? "Automatiche" : "Manuali"}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Caricamento...</p>}

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {(emails || []).map((e) => (
          <div key={e.id} className="p-3 rounded-lg bg-card/60 border border-border/20 text-sm">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span className="truncate max-w-[50%]">→ {e.to_address}</span>
              <span>{format(new Date(e.sent_at), "dd/MM/yy HH:mm")}</span>
            </div>
            <p className="text-foreground text-xs font-medium truncate">{e.subject || "(nessun oggetto)"}</p>
            <div className="flex gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                e.status === "sent" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
              }`}>
                {e.status}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/30 text-muted-foreground">
                {e.category}
              </span>
            </div>
            {e.error_message && <p className="text-xs text-red-400 mt-1">{e.error_message}</p>}
          </div>
        ))}
        {!isLoading && (!emails || emails.length === 0) && (
          <p className="text-muted-foreground text-sm">Nessuna email inviata</p>
        )}
      </div>
    </div>
  );
}
