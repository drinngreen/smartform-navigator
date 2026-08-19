import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";
import { useFormBridge } from "@/hooks/useFormBridge";
import { FormBridgeProvider } from "@/contexts/FormBridgeContext";
import { Shield, LogOut, Send, Loader2, ScanLine, Users, FileText, Globe, Sparkles, Paperclip, X, Mail, Phone, MessageSquare, Database, UserPlus, Bell, Stamp, Activity, Zap, Wand2, Building2, Inbox, CheckCircle2, } from "lucide-react";
import { toast } from "sonner";
import logoDragon from "@/assets/logo-dragon.png";
const GLOBAL_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";
const QUICK_ACTIONS = [
    { label: "Lista utenti app", prompt: "Mostrami gli ultimi 20 utenti app Global Reco con nome, cognome, codice fiscale e data registrazione.", icon: Users, color: "from-emerald-500 to-teal-500" },
    { label: "FIR in bozza", prompt: "Elenca tutti i FIR in stato bozza di Global Reco, ordinati dal più vecchio.", icon: FileText, color: "from-amber-500 to-orange-500" },
    { label: "FIR completati oggi", prompt: "Quanti FIR sono stati completati oggi su Global Reco? Dammi anche l'elenco.", icon: CheckCircle2, color: "from-green-500 to-emerald-500" },
    { label: "Pool numeri FIR", prompt: "Stato del pool fir_number_pool per Global Reco: quanti available, reserved, consumed, suspended.", icon: Database, color: "from-blue-500 to-cyan-500" },
    { label: "Vidima nuovo blocchetto", prompt: "Voglio vidimarmi un nuovo blocchetto FIR RENTRI per Global Reco. Guidami nella scelta dell'unità e del tipo.", icon: Stamp, color: "from-purple-500 to-pink-500" },
    { label: "Crea utente app", prompt: "Voglio creare un nuovo utente app per Global Reco. Chiedimi i dati necessari (nome, cognome, codice fiscale, email).", icon: UserPlus, color: "from-indigo-500 to-purple-500" },
    { label: "Invia email", prompt: "Voglio inviare una email da Global Reco. Chiedimi destinatario, oggetto e contenuto.", icon: Mail, color: "from-rose-500 to-red-500" },
    { label: "Invia SMS / WhatsApp", prompt: "Voglio inviare un SMS o WhatsApp dal numero Global Reco. Chiedimi numero e testo.", icon: MessageSquare, color: "from-teal-500 to-cyan-500" },
    { label: "Chiamate perse", prompt: "Mostrami le chiamate perse di oggi su Global Reco e i numeri da richiamare.", icon: Phone, color: "from-orange-500 to-red-500" },
    { label: "Email in arrivo", prompt: "Ultime 10 email in arrivo su Global Reco non lette.", icon: Inbox, color: "from-sky-500 to-blue-500" },
    { label: "Anagrafica aziende", prompt: "Lista delle ultime 20 aziende in anagrafica Global Reco.", icon: Building2, color: "from-violet-500 to-purple-500" },
    { label: "Notifiche admin", prompt: "Notifiche non lette degli admin Global Reco.", icon: Bell, color: "from-yellow-500 to-amber-500" },
];
function ChatPanel({ onTrace }) {
    const { getRegisteredFields, fillFields } = useFormBridge();
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content: "Ciao 👋 sono **Comando Global Reco**. Posso leggere, scrivere, inviare email/SMS, vidimare FIR, creare utenti, e compilare il formulario a destra. Usa le **scorciatoie qui sopra** o scrivi un comando libero.",
            ts: Date.now(),
        },
    ]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [ocrBusy, setOcrBusy] = useState(false);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [lastOcr, setLastOcr] = useState(null);
    const [userSearch, setUserSearch] = useState("");
    const fileInputRef = useRef(null);
    const scrollRef = useRef(null);
    const filteredUsers = users.filter((u) => {
        const q = userSearch.trim().toLowerCase();
        if (!q)
            return true;
        return [u.nome, u.cognome, u.codice_fiscale]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(q));
    });
    useEffect(() => {
        (async () => {
            const { data } = await supabase
                .from("profiles")
                .select("user_id, nome, cognome, codice_fiscale")
                .eq("tenant_id", GLOBAL_TENANT_ID)
                .order("cognome");
            setUsers(data || []);
        })();
    }, []);
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);
    useEffect(() => {
        const handler = (e) => {
            const prompt = e.detail;
            if (prompt)
                send(prompt);
        };
        window.addEventListener("superglobal-quick", handler);
        return () => window.removeEventListener("superglobal-quick", handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, busy, selectedUser, lastOcr]);
    async function send(textOverride) {
        const text = (textOverride ?? input).trim();
        if (!text || busy)
            return;
        const userMsg = { role: "user", content: text, ts: Date.now() };
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
            if (error)
                throw error;
            const reply = data?.reply || "(nessuna risposta)";
            const updates = (data?.field_updates || []);
            const trace = data?.tool_trace || [];
            let filled = 0;
            if (updates.length)
                filled = fillFields(updates);
            if (trace.length)
                onTrace(trace);
            setMessages((m) => [
                ...m,
                {
                    role: "assistant",
                    content: filled > 0 ? `${reply}\n\n✅ Compilati ${filled} campi nel formulario.` : reply,
                    ts: Date.now(),
                    trace,
                },
            ]);
        }
        catch (e) {
            toast.error(e?.message || "Errore chat");
            setMessages((m) => [
                ...m,
                { role: "assistant", content: `⚠️ Errore: ${e?.message || e}`, ts: Date.now() },
            ]);
        }
        finally {
            setBusy(false);
        }
    }
    async function onFile(e) {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setOcrBusy(true);
        try {
            const b64 = await new Promise((res, rej) => {
                const fr = new FileReader();
                fr.onload = () => res(fr.result.split(",")[1]);
                fr.onerror = rej;
                fr.readAsDataURL(file);
            });
            const { data, error } = await supabase.functions.invoke("ocr-formulario", {
                body: { image_base64: b64, mime_type: file.type },
            });
            if (error)
                throw error;
            setLastOcr(data);
            const fields = (data?.fields || []);
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
        }
        catch (e) {
            toast.error(e?.message || "Errore OCR");
        }
        finally {
            setOcrBusy(false);
            if (fileInputRef.current)
                fileInputRef.current.value = "";
        }
    }
    return (_jsxs("div", { className: "flex flex-col h-full bg-white", children: [_jsxs("div", { className: "p-3 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-emerald-50/50", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Users, { size: 14, className: "text-emerald-600" }), _jsxs("span", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider", children: ["Utente App (", filteredUsers.length, "/", users.length, ")"] }), selectedUser && (_jsx("span", { className: "ml-auto text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold", children: [selectedUser.cognome, selectedUser.nome].filter(Boolean).join(" ") || "selezionato" }))] }), _jsx("input", { type: "text", value: userSearch, onChange: (e) => setUserSearch(e.target.value), placeholder: "\uD83D\uDD0E Cerca per nome, cognome o codice fiscale\u2026", className: "w-full px-3 py-2 mb-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" }), _jsxs("select", { value: selectedUser?.user_id || "", onChange: (e) => {
                            const u = users.find((x) => x.user_id === e.target.value) || null;
                            setSelectedUser(u);
                        }, className: "w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500", children: [_jsx("option", { value: "", children: "\u2014 Nessun utente selezionato \u2014" }), filteredUsers.map((u) => (_jsxs("option", { value: u.user_id, children: [[u.cognome, u.nome].filter(Boolean).join(" ") || u.codice_fiscale || u.user_id.slice(0, 8), u.codice_fiscale ? ` · ${u.codice_fiscale}` : ""] }, u.user_id)))] })] }), _jsxs("div", { ref: scrollRef, className: "flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-white to-slate-50", children: [messages.map((m, i) => (_jsx("div", { className: `flex ${m.role === "user" ? "justify-end" : "justify-start"}`, children: _jsxs("div", { className: `max-w-[88%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap shadow-sm ${m.role === "user"
                                ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white"
                                : "bg-white text-slate-900 border border-slate-200"}`, children: [m.content, m.trace && m.trace.length > 0 && (_jsx("div", { className: "mt-2 pt-2 border-t border-slate-200 flex flex-wrap gap-1", children: m.trace.map((t, j) => (_jsxs("span", { className: "text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono", children: ["\uD83D\uDD27 ", t.tool] }, j))) }))] }) }, i))), busy && (_jsxs("div", { className: "flex items-center gap-2 text-xs text-slate-500 px-2", children: [_jsx(Loader2, { size: 14, className: "animate-spin text-emerald-600" }), " Comando Global Reco sta operando\u2026"] }))] }), _jsxs("div", { className: "p-3 border-t border-slate-200 bg-gradient-to-t from-slate-50 to-white space-y-2", children: [lastOcr && (_jsxs("div", { className: "flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1", children: [_jsx(ScanLine, { size: 12 }), " OCR caricato (", lastOcr.fields?.length || 0, " campi)", _jsx("button", { onClick: () => setLastOcr(null), className: "ml-auto", children: _jsx(X, { size: 12 }) })] })), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", className: "hidden", onChange: onFile }), _jsx("button", { onClick: () => fileInputRef.current?.click(), disabled: ocrBusy, title: "OCR Gemini Vision", className: "p-2 rounded-lg bg-white border border-slate-300 hover:bg-emerald-50 hover:border-emerald-400 disabled:opacity-50 text-slate-700 transition-colors", children: ocrBusy ? _jsx(Loader2, { size: 16, className: "animate-spin" }) : _jsx(Paperclip, { size: 16 }) }), _jsx("input", { value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send()), placeholder: "Comando libero per Global Reco\u2026", className: "flex-1 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" }), _jsxs("button", { onClick: () => send(), disabled: busy || !input.trim(), className: "px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2 shadow-md", children: [_jsx(Send, { size: 14 }), " Invia"] })] })] })] }));
}
function QuickActionsBar({ onPick, busy }) {
    return (_jsx("div", { className: "border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-2 shrink-0 shadow-sm", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "flex items-center gap-1 shrink-0 pr-2 border-r border-slate-200", children: [_jsx(Zap, { size: 12, className: "text-amber-500" }), _jsx("span", { className: "text-[10px] font-bold text-slate-600 uppercase tracking-wider", children: "Comandi" })] }), _jsx("div", { className: "flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5", children: QUICK_ACTIONS.map((qa) => (_jsxs("button", { onClick: () => onPick(qa.prompt), disabled: busy, className: `shrink-0 px-2.5 py-1.5 rounded-lg bg-gradient-to-br ${qa.color} text-white text-[11px] font-semibold disabled:opacity-50 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-1.5 whitespace-nowrap`, children: [_jsx(qa.icon, { size: 12 }), qa.label] }, qa.label))) })] }) }));
}
export default function SuperAdminGlobalDashboard() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [lastTrace, setLastTrace] = useState([]);
    const handleLogout = async () => {
        await signOut();
        navigate("/auth", { replace: true });
    };
    return (_jsxs(FormBridgeProvider, { children: [_jsx("style", { children: `
        .superglobal-form, .superglobal-form * { color: #0f172a !important; }
        .superglobal-form input, .superglobal-form textarea, .superglobal-form select {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
        }
        .superglobal-form input::placeholder, .superglobal-form textarea::placeholder { color: #94a3b8 !important; }
        .superglobal-form label, .superglobal-form .label { color: #1e293b !important; font-weight: 600; }
      ` }), _jsxs("div", { className: "h-screen flex flex-col bg-slate-100 text-slate-900", children: [_jsxs("div", { className: "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white text-center py-1.5 px-4 font-display text-xs tracking-[0.25em] flex items-center justify-center gap-2 shadow-md", children: [_jsx(Globe, { size: 14, className: "animate-pulse" }), _jsx("span", { className: "font-bold", children: "COMANDO GLOBAL RECO \u00B7 CONTROLLO TOTALE AI" }), _jsx(Sparkles, { size: 14, className: "animate-pulse" })] }), _jsxs("header", { className: "border-b border-slate-200 bg-white/90 backdrop-blur px-5 py-3 flex items-center justify-between shrink-0 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative", children: [_jsx("img", { src: logoDragon, alt: "", className: "h-10 w-10", style: { filter: "drop-shadow(0 0 10px rgba(16,185,129,0.5))" } }), _jsx("div", { className: "absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white", children: _jsx(Shield, { size: 10, className: "text-white" }) })] }), _jsxs("div", { children: [_jsxs("div", { className: "font-display text-base tracking-wider flex items-center gap-2 text-slate-900 font-bold", children: ["SUPER ADMIN ", _jsx("span", { className: "text-emerald-600", children: "GLOBAL" }), _jsx("span", { className: "text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold", children: "AI \u00B7 CRUD \u00B7 SEND" })] }), _jsx("div", { className: "text-[11px] text-slate-500 font-mono", children: user?.email })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "hidden md:flex items-center gap-1 text-[10px] text-slate-500 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200", children: [_jsx(Activity, { size: 10, className: "text-emerald-500" }), " Live \u00B7 solo Global Reco"] }), _jsxs("button", { onClick: () => navigate("/admin"), className: "px-3 py-1.5 rounded-lg text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-medium flex items-center gap-2 transition-colors", children: [_jsx(FileText, { size: 12 }), " Admin Global Reco"] }), _jsxs("button", { onClick: handleLogout, className: "px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:text-white hover:bg-rose-500 border border-slate-200 hover:border-rose-500 flex items-center gap-2 transition-colors", children: [_jsx(LogOut, { size: 12 }), " Logout"] })] })] }), _jsx(QuickActionsBar, { busy: false, onPick: (p) => window.dispatchEvent(new CustomEvent("superglobal-quick", { detail: p })) }), _jsxs("div", { className: "flex-1 grid grid-cols-[460px_1fr] overflow-hidden min-h-0", children: [_jsx("div", { className: "border-r border-slate-200 shadow-[4px_0_12px_rgba(15,23,42,0.04)] min-h-0 overflow-hidden", children: _jsx(ChatPanel, { onTrace: setLastTrace }) }), _jsx("div", { className: "overflow-auto bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 min-h-0", children: _jsxs("div", { className: "p-5 superglobal-form", children: [_jsxs("div", { className: "bg-white rounded-2xl shadow-xl border border-slate-200 p-5", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4 pb-3 border-b border-slate-200", children: [_jsx("div", { className: "h-8 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" }), _jsx(Wand2, { size: 16, className: "text-emerald-600" }), _jsx("h2", { className: "font-display text-lg font-bold text-slate-900 tracking-wide", children: "COMPILATORE FORMULARIO" }), _jsx("span", { className: "ml-auto text-[10px] uppercase tracking-widest text-emerald-700 bg-gradient-to-r from-emerald-100 to-teal-100 px-2 py-1 rounded-full font-bold", children: "Live \u00B7 AI Bridge" })] }), _jsx(FIRAlternativeForm, {})] }), lastTrace.length > 0 && (_jsxs("div", { className: "mt-4 bg-slate-900 text-emerald-300 rounded-2xl shadow-lg border border-slate-700 p-4 font-mono text-[11px]", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2 text-emerald-400", children: [_jsx(Activity, { size: 12 }), " ", _jsx("span", { className: "font-bold uppercase tracking-wider text-xs", children: "Ultima esecuzione AI" }), _jsxs("span", { className: "ml-auto text-slate-400", children: [lastTrace.length, " step"] })] }), _jsx("div", { className: "space-y-1.5 max-h-60 overflow-auto", children: lastTrace.map((t, i) => (_jsxs("div", { className: "border-l-2 border-emerald-500 pl-2", children: [_jsxs("div", { className: "text-emerald-400 font-bold", children: ["\u2192 ", t.tool] }), _jsxs("div", { className: "text-slate-400 truncate", children: ["args: ", JSON.stringify(t.args).slice(0, 200)] }), _jsxs("div", { className: "text-slate-500 truncate", children: ["res: ", JSON.stringify(t.result).slice(0, 200)] })] }, i))) })] }))] }) })] })] })] }));
}
