import { useState } from "react";
import { Send, Image, Shield, Megaphone } from "lucide-react";

interface SocialComposerProps {
  userInitial?: string;
  onSubmit: (content: string, postType?: string) => Promise<void>;
}

export function SocialComposer({ userInitial = "U", onSubmit }: SocialComposerProps) {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("general");
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    await onSubmit(content.trim(), postType);
    setContent("");
    setPostType("general");
    setExpanded(false);
    setSubmitting(false);
  };

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl overflow-hidden">
      {/* Input area */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-br from-primary to-accent shrink-0 mt-0.5">
          <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-xs font-bold text-primary">
            {userInitial}
          </div>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="A cosa stai pensando in viaggio? 🚛"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 resize-none outline-none min-h-[38px] leading-relaxed"
          rows={expanded ? 3 : 1}
          maxLength={2000}
        />
      </div>

      {/* Action bar */}
      <div className="border-t border-border/30 px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-accent text-[11px] font-medium transition-all">
            <Image size={14} /> Media
          </button>
          <button
            onClick={() => setPostType(postType === "safety_tip" ? "general" : "safety_tip")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all border ${
              postType === "safety_tip"
                ? "bg-destructive/15 border-destructive/40 text-destructive"
                : "bg-secondary/60 border-transparent text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Shield size={13} /> Safety
          </button>
          <button
            onClick={() => setPostType(postType === "announcement" ? "general" : "announcement")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all border ${
              postType === "announcement"
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-secondary/60 border-transparent text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Megaphone size={13} /> Annuncio
          </button>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl text-[11px] font-bold disabled:opacity-30 hover:shadow-[var(--glow-gold-subtle)] transition-all shrink-0"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}
