import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";
import { useFormBridge } from "@/hooks/useFormBridge";
import { FormBridgeProvider } from "@/contexts/FormBridgeContext";
import {
  Shield, LogOut, Send, Loader2, ScanLine, Users, FileText,
  Globe, Sparkles, Paperclip, X
} from "lucide-react";
import { toast } from "sonner";
import logoDragon from "@/assets/logo-dragon.png";

const GLOBAL_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
}

interface AppUser {
  user_id: string;
  nome: string | null;
  cognome: string | null;
  codice_fiscale: string | null;
}

function ChatPanel() {
  const { getRegisteredFields, fillFields } = useFormBridge();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ciao 👋 sono **Comando Global Reco**. Seleziona un utente app a destra, poi dimmi cosa compilare nel formulario o carica una foto del FIR per OCR.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [lastOcr, setLastOcr] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, nome, cognome, codice_fiscale")
        .eq("tenant_id", GLOBAL_TENANT_ID)
        .order("cognome");
      setUsers((data as AppUser[]) || []);
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const userMsg: ChatMessage = { role: "user", content: text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);

    try {
      const { data, error } = await supabase.functions.invoke("super-global-chat", {
        body: {
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          form_fields: getRegisteredFields(),
          selected_user: selectedUser,
          ocr_context: lastOcr,
        },
      });
      if (error) throw error;

      const reply = data?.reply || "(nessuna risposta)";
      const updates = (data?.field_updates || []) as { id: string; value: string }[];
      let filled = 0;
      if (updates.length) {
        filled = fillFields(updates);
      }

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: filled > 0 ? `${reply}\n\n✅ Compilati ${filled} campi nel formulario.` : reply,
          ts: Date.now(),
        },
      ]);
    } catch (e: any) {
      toast.error(e?.message || "Errore chat");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠️ Errore: ${e?.message || e}`, ts: Date.now() },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrBusy(true);
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res((fr.result as string).split(",")[1]);
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("ocr-formulario", {
        body: { image_base64: b64, mime_type: file.type },
      });
      if (error) throw error;
      setLastOcr(data);

      const fields = (data?.fields || []) as { id: string; label: string; value: string }[];
      const filled = fillFields(fields.map((f) => ({ id: f.id, value: f.value })));

      setMessages((m) => [
        ...m,
        { role: "user", content: `📎 OCR caricato: ${file.name}`, ts: Date.now() },
        {
          role: "assistant",
          content: `🔍 OCR completato (confidence: ${data?.confidence || "n/a"}). Estratti **${fields.length}** campi, applicati **${filled}** al formulario.`,
          ts: Date.now(),
        },
      ]);
    } catch (e: any) {
      toast.error(e?.message || "Errore OCR");
    } finally {
      setOcrBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* User selector */}
      <div className="p-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2 mb-2">
          <Users size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Utente App Global
          </span>
        </div>
        <select
          value={selectedUser?.user_id || ""}
          onChange={(e) => {
            const u = users.find((x) => x.user_id === e.target.value) || null;
            setSelectedUser(u);
          }}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">— Seleziona utente —</option>
          {users.map((u) => (
            <option key={u.user_id} value={u.user_id}>
              {[u.cognome, u.nome].filter(Boolean).join(" ") || u.codice_fiscale || u.user_id.slice(0, 8)}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-secondary text-foreground border border-border"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> Elaborazione…
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-secondary/20 space-y-2">
        {lastOcr && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 rounded-lg px-2 py-1">
            <ScanLine size={12} /> OCR caricato ({lastOcr.fields?.length || 0} campi)
            <button onClick={() => setLastOcr(null)} className="ml-auto">
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={ocrBusy}
            title="OCR (OpenRouter Gemini Vision)"
            className="p-2 rounded-lg bg-background border border-border hover:bg-secondary disabled:opacity-50"
          >
            {ocrBusy ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Scrivi un comando o una richiesta…"
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={14} /> Invia
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminGlobalDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <FormBridgeProvider>
      <div className="h-screen flex flex-col bg-background text-foreground">
        {/* Banner */}
        <div className="bg-emerald-700 text-white text-center py-1.5 px-4 font-display text-xs tracking-wider flex items-center justify-center gap-2">
          <Globe size={14} />
          COMANDO GLOBAL RECO — SUPER ADMIN
          <Sparkles size={14} />
        </div>

        {/* Header */}
        <header className="border-b border-border bg-card px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img src={logoDragon} alt="" className="h-8 w-8" style={{ filter: "drop-shadow(0 0 8px rgba(16,185,129,0.6))" }} />
            <div>
              <div className="font-display text-sm tracking-wider flex items-center gap-2">
                <Shield size={14} className="text-emerald-400" /> SUPER ADMIN GLOBAL
              </div>
              <div className="text-[10px] text-muted-foreground">{user?.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin")}
              className="px-3 py-1.5 rounded-lg text-xs bg-secondary/50 hover:bg-secondary border border-border flex items-center gap-2"
            >
              <FileText size={12} /> Admin Global Reco
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 flex items-center gap-2"
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        </header>

        {/* Split */}
        <div className="flex-1 grid grid-cols-[420px_1fr] overflow-hidden">
          <ChatPanel />
          <div className="overflow-auto bg-background">
            <div className="p-4">
              <FIRAlternativeForm />
            </div>
          </div>
        </div>
      </div>
    </FormBridgeProvider>
  );
}
