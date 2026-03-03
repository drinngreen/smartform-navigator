// Componente inbox email Global Reco
import { useState } from "react";
import { useGlobalInbox, useToggleRead, useSyncInbox } from "@/hooks/useGlobalEmail";
import { Button } from "@/components/ui/button";
import { RefreshCw, Mail, MailOpen, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export function GlobalEmailInbox() {
  const { data: emails, isLoading } = useGlobalInbox();
  const toggleRead = useToggleRead();
  const syncInbox = useSyncInbox();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = emails?.find((e) => e.id === selectedId);

  if (selected) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Torna alla lista
        </Button>
        <div className="p-4 rounded-xl bg-card/60 border border-border/30 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{selected.subject || "(nessun oggetto)"}</h3>
              <p className="text-xs text-muted-foreground mt-1">Da: {selected.from_address}</p>
              <p className="text-xs text-muted-foreground">A: {selected.to_address}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(selected.received_at), "dd/MM/yyyy HH:mm")}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleRead.mutate({ id: selected.id, is_read: !selected.is_read })}
            >
              {selected.is_read ? <MailOpen className="h-4 w-4 mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
              {selected.is_read ? "Segna non letto" : "Segna letto"}
            </Button>
          </div>
          {selected.body_html ? (
            <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: selected.body_html }} />
          ) : (
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.body_text || "—"}</pre>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Inbox — globalreco@zoli.live</h3>
        <Button size="sm" variant="outline" onClick={() => syncInbox.mutate()} disabled={syncInbox.isPending}>
          <RefreshCw className={`h-4 w-4 mr-1 ${syncInbox.isPending ? "animate-spin" : ""}`} /> Sincronizza
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Caricamento...</p>}

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {(emails || []).map((e) => (
          <button
            key={e.id}
            onClick={() => {
              setSelectedId(e.id);
              if (!e.is_read) toggleRead.mutate({ id: e.id, is_read: true });
            }}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              e.is_read
                ? "bg-card/40 border-border/20 text-muted-foreground"
                : "bg-card/70 border-primary/30 text-foreground font-medium"
            } hover:bg-card/80`}
          >
            <div className="flex justify-between text-xs mb-1">
              <span className="truncate max-w-[60%]">{e.from_address}</span>
              <span>{format(new Date(e.received_at), "dd/MM HH:mm")}</span>
            </div>
            <p className="text-sm truncate">{e.subject || "(nessun oggetto)"}</p>
          </button>
        ))}
        {!isLoading && (!emails || emails.length === 0) && (
          <p className="text-muted-foreground text-sm">Nessuna email in inbox</p>
        )}
      </div>
    </div>
  );
}
