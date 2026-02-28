import { useState } from "react";
import { Send, Shield, Megaphone } from "lucide-react";

interface SocialCreatePostProps {
  onSubmit: (content: string, postType?: string) => Promise<void>;
}

export function SocialCreatePost({ onSubmit }: SocialCreatePostProps) {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("general");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    await onSubmit(content.trim(), postType);
    setContent("");
    setPostType("general");
    setSubmitting(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Cosa vuoi condividere?"
        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[80px]"
        maxLength={2000}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[
            { value: "general", label: "Post", icon: null },
            { value: "safety_tip", label: "Safety", icon: <Shield size={12} /> },
            { value: "announcement", label: "Annuncio", icon: <Megaphone size={12} /> },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setPostType(t.value)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all ${
                postType === t.value
                  ? "bg-primary/20 border-primary text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50 hover:brightness-110 transition-all"
        >
          <Send size={14} /> Pubblica
        </button>
      </div>
    </div>
  );
}
