import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Paperclip, Mic, MicOff, X, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractAttachmentText } from "@/lib/attachmentExtract";

interface Attachment {
  type: string;
  name: string;
  dataUrl: string;
  preview?: string;
  extractedText?: string;
}

interface DarkLemonInputBarProps {
  onSend: (content: string, attachments?: Attachment[]) => void;
  isLoading: boolean;
}

export function DarkLemonInputBar({ onSend, isLoading }: DarkLemonInputBarProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isPreparingAttachments, setIsPreparingAttachments] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  const readFileAsDataUrl = useCallback((file: File) => new Promise<Attachment>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({
        type: file.type,
        name: file.name,
        dataUrl,
        preview: file.type.startsWith("image/") ? dataUrl : undefined,
      });
    };
    reader.onerror = () => reject(reader.error || new Error(`Impossibile leggere ${file.name}`));
    reader.readAsDataURL(file);
  }), []);

  const handleSend = useCallback(() => {
    if ((!input.trim() && attachments.length === 0) || isLoading || isPreparingAttachments) return;
    const text = input.trim() || (attachments.length > 0 ? `Analizza ${attachments.length === 1 ? "questo file" : "questi file"}` : "");
    onSend(text, attachments.length > 0 ? attachments : undefined);
    setInput("");
    setAttachments([]);
  }, [input, attachments, isLoading, isPreparingAttachments, onSend]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" troppo grande (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsPreparingAttachments(true);
    try {
      const nextAttachments = await Promise.all(validFiles.map(readFileAsDataUrl));
      setAttachments((prev) => [...prev, ...nextAttachments]);
    } catch (error) {
      console.error("Attachment read error:", error);
      alert("Non sono riuscito a leggere uno degli allegati. Riprova.");
    } finally {
      setIsPreparingAttachments(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [readFileAsDataUrl]);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "it-IT";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interim = transcript;
        }
      }
      setInput(finalTranscript + interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording]);

  return (
    <div className="p-3 border-t border-white/10 shrink-0" onMouseDown={e => e.stopPropagation()}>
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachments.map((att, i) => (
            <div key={i} className="relative group">
              {att.preview ? (
                <img src={att.preview} alt={att.name} className="h-14 w-14 object-cover rounded-lg border border-white/10" />
              ) : (
                <div className="h-14 w-14 rounded-lg border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-0.5 px-1">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  <span className="text-[8px] text-white/50 truncate w-full text-center">{att.name.split('.').pop()}</span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-2.5 w-2.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        {/* File attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          onMouseDown={e => e.stopPropagation()}
          disabled={isPreparingAttachments}
          className="p-2 rounded-xl text-white/40 hover:text-cyan-400 hover:bg-white/5 transition-all shrink-0 disabled:opacity-40 disabled:hover:text-white/40"
          title={isPreparingAttachments ? "Sto preparando gli allegati..." : "Allega file o immagine"}
        >
          {isPreparingAttachments ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Voice dictation button */}
        {speechSupported && (
          <button
            onClick={toggleRecording}
            onMouseDown={e => e.stopPropagation()}
            className={cn(
              "p-2 rounded-xl transition-all shrink-0",
              isRecording
                ? "text-red-400 bg-red-500/20 animate-pulse"
                : "text-white/40 hover:text-cyan-400 hover:bg-white/5"
            )}
            title={isRecording ? "Ferma registrazione" : "Dettatura vocale"}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}

        {/* Text input */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder={isRecording ? "🎙️ Sto ascoltando..." : "Chiedi qualcosa..."}
          className={cn(
            "flex-1 bg-white/5 border rounded-xl px-3 py-2 text-white text-xs placeholder:text-white/30 focus:outline-none transition-colors",
            isRecording ? "border-red-500/50 focus:border-red-500/70" : "border-white/10 focus:border-cyan-500/50"
          )}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          onMouseDown={e => e.stopPropagation()}
          disabled={(!input.trim() && attachments.length === 0) || isLoading || isPreparingAttachments}
          className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 disabled:opacity-30 hover:bg-cyan-500/30 transition-all shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      {isPreparingAttachments && (
        <p className="mt-2 text-[10px] text-white/40">Sto preparando gli allegati prima dell'invio…</p>
      )}
    </div>
  );
}
