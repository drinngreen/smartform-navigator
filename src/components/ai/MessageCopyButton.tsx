import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface MessageCopyButtonProps {
  content: string;
  className?: string;
}

export function MessageCopyButton({ content, className = "" }: MessageCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Testo copiato!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossibile copiare");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 ${
        copied
          ? "bg-green-500/20 text-green-400"
          : "bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10"
      } ${className}`}
      title="Copia testo"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}
