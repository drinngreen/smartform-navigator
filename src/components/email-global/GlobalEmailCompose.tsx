// Componente composizione email manuale Global Reco
import { useState } from "react";
import { useSendGlobalEmail } from "@/hooks/useGlobalEmail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

export function GlobalEmailCompose() {
  const sendEmail = useSendGlobalEmail();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");

  const handleSend = () => {
    if (!to.trim()) return;
    sendEmail.mutate(
      { to, subject, html: html || `<p>${html}</p>`, category: "manuale" },
      {
        onSuccess: () => {
          setTo("");
          setSubject("");
          setHtml("");
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Nuova Email</h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Da</label>
          <Input value="globalreco@zoli.live" disabled className="h-9 opacity-60" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Destinatario *</label>
          <Input placeholder="email@esempio.com" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Oggetto</label>
          <Input placeholder="Oggetto email" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Corpo</label>
          <Textarea placeholder="Scrivi il contenuto dell'email..." value={html} onChange={(e) => setHtml(e.target.value)} rows={8} />
        </div>
        <Button onClick={handleSend} disabled={sendEmail.isPending || !to.trim()} size="sm">
          <Send className="h-4 w-4 mr-1" /> {sendEmail.isPending ? "Invio..." : "Invia Email"}
        </Button>
      </div>
    </div>
  );
}
