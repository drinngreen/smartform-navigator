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

  const chips = [
    { value: "general", label: "Post", icon: null, color: "text-foreground" },
    { value: "safety_tip", label: "Safety Tip", icon: <Shield size={13} />, color: "text-destructive" },
    { value: "announcement", label: "Annuncio", icon: <Megaphone size={13} />, color: "text-primary" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg shadow-black/20">
      {/* Input area */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-accent/30 border-2 border-primary/50 flex items-center justify-center text-sm font-bold text-primary shrink-0 mt-0.5">
          {userInitial}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="A cosa stai pensando in viaggio? 🚛"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[40px]"
          rows={expanded ? 3 : 1}
          maxLength={2000}
        />
      </div>

      {/* Chips + action bar */}
      <div className="border-t border-border/50 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-accent text-xs font-medium transition-all">
            <Image size={14} /> Foto/Video
          </button>
          {chips.filter(c => c.value !== "general").map((chip) => (
            <button
              key={chip.value}
              onClick={() => setPostType(postType === chip.value ? "general" : chip.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                postType === chip.value
                  ? chip.value === "safety_tip"
                    ? "bg-destructive/20 border-destructive/50 text-destructive"
                    : "bg-primary/20 border-primary/50 text-primary"
                  : "bg-secondary/80 border-transparent text-muted-foreground hover:bg-secondary"
              }`}
            >
              {chip.icon} {chip.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full text-xs font-bold disabled:opacity-40 hover:shadow-[var(--glow-gold-subtle)] transition-all shrink-0"
        >
          <Send size={14} /> Pubblica
        </button>
      </div>
    </div>
  );
}
