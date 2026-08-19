import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RubricaTab } from "@/components/comunicazioni/RubricaTab";
import { SMSComposer } from "@/components/comunicazioni/SMSComposer";
import { WhatsAppChat } from "@/components/comunicazioni/WhatsAppChat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookUser, MessageSquare, Phone, Users, Building2, Search, PhoneCall, Plus, Edit, Trash2, FileSpreadsheet, Printer, ListChecks, FileText, } from "lucide-react";
import { AnagraficaCompletaMP } from "./AnagraficaCompletaMP";
import { DevFormulariList } from "./DevFormulariList";
import { toast } from "sonner";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const GLOBAL_FIR_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";
export function DevContattiModule() {
    return (_jsxs(Tabs, { defaultValue: "rubrica", className: "space-y-4", children: [_jsxs(TabsList, { className: "bg-card/60 border border-border/30 p-1 h-auto flex-wrap gap-1", children: [_jsxs(TabsTrigger, { value: "rubrica", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(BookUser, { className: "h-4 w-4" }), " Rubrica"] }), _jsxs(TabsTrigger, { value: "anagrafiche", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(Users, { className: "h-4 w-4" }), " Anagrafiche"] }), _jsxs(TabsTrigger, { value: "sms", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(MessageSquare, { className: "h-4 w-4" }), " SMS"] }), _jsxs(TabsTrigger, { value: "whatsapp", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(Phone, { className: "h-4 w-4" }), " WhatsApp"] }), _jsxs(TabsTrigger, { value: "chiamate", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(PhoneCall, { className: "h-4 w-4" }), " Report Chiamate"] }), _jsxs(TabsTrigger, { value: "anagrafica-completa", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(ListChecks, { className: "h-4 w-4" }), " Anagrafica Completa"] }), _jsxs(TabsTrigger, { value: "formulari", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(FileText, { className: "h-4 w-4" }), " Formulari"] })] }), _jsx(TabsContent, { value: "rubrica", children: _jsx("div", { className: "p-4 rounded-2xl bg-card/60 border border-emerald-500/20", children: _jsx(RubricaTab, { basePath: "/mn/admin/dev-multyproget", tenantId: MULTY_TENANT_ID }) }) }), _jsx(TabsContent, { value: "anagrafiche", children: _jsx(AnagraficheView, {}) }), _jsx(TabsContent, { value: "sms", children: _jsx("div", { className: "p-4 rounded-2xl bg-card/60 border border-emerald-500/20", children: _jsx(SMSComposer, {}) }) }), _jsx(TabsContent, { value: "whatsapp", children: _jsx("div", { className: "p-4 rounded-2xl bg-card/60 border border-emerald-500/20", children: _jsx(WhatsAppChat, {}) }) }), _jsx(TabsContent, { value: "chiamate", children: _jsx(ReportChiamateView, {}) }), _jsx(TabsContent, { value: "anagrafica-completa", children: _jsx("div", { className: "p-4 rounded-2xl bg-card/60 border border-emerald-500/20", children: _jsx(AnagraficaCompletaMP, {}) }) }), _jsx(TabsContent, { value: "formulari", children: _jsx("div", { className: "p-4 rounded-2xl bg-card/60 border border-emerald-500/20", children: _jsx(DevFormulariList, { tenantId: MULTY_TENANT_ID, mnContext: "multyproget", fallbackTenantId: GLOBAL_FIR_TENANT_ID, accent: "emerald", title: "Formulari collegati ai contatti \u2014 modifica / elimina / scegli modulo" }) }) })] }));
}
// ─── Anagrafiche Privati + Aziende with CRUD ───
function AnagraficheView() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("privati");
    const [showNewPrivato, setShowNewPrivato] = useState(false);
    const [showEditPrivato, setShowEditPrivato] = useState(null);
    const [privatoForm, setPrivatoForm] = useState({
        nome: "", cognome: "", codice_fiscale: "", comune_residenza: "", tipo_utenza: "domestica",
        telefono: "", cellulare: "", email: "", pec: "", indirizzo: "", cap: "", provincia: "", note: "",
    });
    const { data: privati, refetch: refetchPrivati } = useQuery({
        queryKey: ["dev-anagrafiche-privati", MULTY_TENANT_ID],
        queryFn: async () => {
            const { data, error } = await supabase.from("anagrafica_privati").select("*").eq("tenant_id", MULTY_TENANT_ID).order("cognome");
            if (error)
                throw error;
            return data;
        },
    });
    const { data: aziende } = useQuery({
        queryKey: ["dev-anagrafiche-aziende", MULTY_TENANT_ID],
        queryFn: async () => {
            const { data, error } = await supabase.from("organizations").select("*").order("name");
            if (error)
                throw error;
            return data;
        },
    });
    const resetForm = () => setPrivatoForm({
        nome: "", cognome: "", codice_fiscale: "", comune_residenza: "", tipo_utenza: "domestica",
        telefono: "", cellulare: "", email: "", pec: "", indirizzo: "", cap: "", provincia: "", note: "",
    });
    const openEdit = (p) => {
        setPrivatoForm({
            nome: p.nome || "", cognome: p.cognome || "", codice_fiscale: p.codice_fiscale || "",
            comune_residenza: p.comune_residenza || "", tipo_utenza: p.tipo_utenza || "domestica",
            telefono: p.telefono || "", cellulare: p.cellulare || "", email: p.email || "", pec: p.pec || "",
            indirizzo: p.indirizzo || "", cap: p.cap || "", provincia: p.provincia || "", note: p.note || "",
        });
        setShowEditPrivato(p);
    };
    const handleSavePrivato = async () => {
        if (!privatoForm.nome || !privatoForm.cognome || !privatoForm.codice_fiscale) {
            toast.error("Nome, cognome e CF obbligatori");
            return;
        }
        if (showEditPrivato) {
            // Update
            const { error } = await supabase.from("anagrafica_privati").update(privatoForm).eq("id", showEditPrivato.id);
            if (error) {
                toast.error(error.message);
                return;
            }
            toast.success("Anagrafica aggiornata");
            setShowEditPrivato(null);
        }
        else {
            // Insert
            const { error } = await supabase.from("anagrafica_privati").insert({ ...privatoForm, tenant_id: MULTY_TENANT_ID });
            if (error) {
                toast.error(error.message);
                return;
            }
            toast.success("Nuovo privato registrato");
            setShowNewPrivato(false);
        }
        resetForm();
        refetchPrivati();
    };
    const handleDeletePrivato = async (id) => {
        if (!window.confirm("Eliminare questo privato?"))
            return;
        const { error } = await supabase.from("anagrafica_privati").update({ attivo: false }).eq("id", id);
        if (error) {
            toast.error(error.message);
            return;
        }
        toast.success("Privato disattivato");
        refetchPrivati();
    };
    const q = search.toLowerCase();
    const filteredPrivati = (privati || []).filter(p => !q || `${p.nome} ${p.cognome} ${p.codice_fiscale} ${p.comune_residenza || ""}`.toLowerCase().includes(q));
    const filteredAziende = (aziende || []).filter(a => !q || `${a.name} ${a.piva} ${a.codice_fiscale || ""} ${a.comune || ""}`.toLowerCase().includes(q));
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca nome, CF, P.IVA, comune...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-10 bg-card/60 border-border/30" })] }), _jsxs(Button, { onClick: () => { resetForm(); setShowNewPrivato(true); }, className: "gap-2 bg-emerald-600 hover:bg-emerald-700", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo Privato"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                            const data = tab === "privati" ? filteredPrivati : filteredAziende;
                            if (!data.length)
                                return toast.error("Nessun dato da esportare");
                            const cols = tab === "privati" ? [
                                { header: "Nome", key: "_nome", width: 20, format: (_, r) => `${r.cognome} ${r.nome}` },
                                { header: "CF", key: "codice_fiscale", width: 18 },
                                { header: "Comune", key: "comune_residenza", width: 16 },
                                { header: "Tipo", key: "tipo_utenza", width: 12 },
                                { header: "Telefono", key: "_tel", width: 14, format: (_, r) => r.telefono || r.cellulare || "-" },
                                { header: "Email", key: "email", width: 22 },
                            ] : [
                                { header: "Denominazione", key: "name", width: 24 },
                                { header: "P.IVA", key: "piva", width: 14 },
                                { header: "CF", key: "codice_fiscale", width: 18 },
                                { header: "Comune", key: "comune", width: 16 },
                                { header: "Indirizzo", key: "indirizzo", width: 22 },
                            ];
                            exportToExcel(data, cols, `anagrafiche-${tab}-dev`, tab === "privati" ? "Privati" : "Aziende");
                        }, className: "gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(FileSpreadsheet, { className: "h-3 w-3" }), " Excel"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                            const data = tab === "privati" ? filteredPrivati : filteredAziende;
                            if (!data.length)
                                return toast.error("Nessun dato da esportare");
                            const cols = tab === "privati" ? [
                                { header: "Nome", key: "_nome", width: 20, format: (_, r) => `${r.cognome} ${r.nome}` },
                                { header: "CF", key: "codice_fiscale", width: 18 },
                                { header: "Comune", key: "comune_residenza", width: 16 },
                                { header: "Tipo", key: "tipo_utenza", width: 12 },
                                { header: "Telefono", key: "_tel", width: 14, format: (_, r) => r.telefono || r.cellulare || "-" },
                                { header: "Email", key: "email", width: 22 },
                            ] : [
                                { header: "Denominazione", key: "name", width: 24 },
                                { header: "P.IVA", key: "piva", width: 14 },
                                { header: "CF", key: "codice_fiscale", width: 18 },
                                { header: "Comune", key: "comune", width: 16 },
                                { header: "Indirizzo", key: "indirizzo", width: 22 },
                            ];
                            exportToPdf(data, cols, `anagrafiche-${tab}-dev`, `Anagrafiche ${tab === "privati" ? "Privati" : "Aziende"}`);
                        }, className: "gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(Printer, { className: "h-3 w-3" }), " PDF"] }), _jsxs("div", { className: "flex gap-1", children: [_jsxs("button", { onClick: () => setTab("privati"), className: `px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "privati" ? "bg-emerald-600 text-white" : "bg-card/60 text-muted-foreground hover:text-foreground border border-border/30"}`, children: [_jsx(Users, { className: "h-4 w-4 inline mr-1" }), " Privati (", filteredPrivati.length, ")"] }), _jsxs("button", { onClick: () => setTab("aziende"), className: `px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "aziende" ? "bg-emerald-600 text-white" : "bg-card/60 text-muted-foreground hover:text-foreground border border-border/30"}`, children: [_jsx(Building2, { className: "h-4 w-4 inline mr-1" }), " Aziende (", filteredAziende.length, ")"] })] })] }), tab === "privati" ? (_jsx(Card, { className: "bg-card/60 border-border/30", children: _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "overflow-x-auto max-h-[500px] overflow-y-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "sticky top-0 bg-card", children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Nome" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "CF" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Comune" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Tipo" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Telefono" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Email" }), _jsx("th", { className: "text-right p-3 text-xs uppercase", children: "Azioni" })] }) }), _jsxs("tbody", { children: [filteredPrivati.slice(0, 100).map((p) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsxs("td", { className: "p-3 font-medium", children: [p.cognome, " ", p.nome] }), _jsx("td", { className: "p-3 font-mono text-xs text-muted-foreground", children: p.codice_fiscale }), _jsx("td", { className: "p-3 text-muted-foreground", children: p.comune_residenza || "—" }), _jsx("td", { className: "p-3", children: _jsx("span", { className: "px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400", children: p.tipo_utenza }) }), _jsx("td", { className: "p-3 text-muted-foreground", children: p.telefono || p.cellulare || "—" }), _jsx("td", { className: "p-3 text-muted-foreground", children: p.email || "—" }), _jsx("td", { className: "p-3 text-right", children: _jsxs("div", { className: "flex gap-1 justify-end", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => openEdit(p), className: "text-emerald-400 h-7 w-7 p-0", children: _jsx(Edit, { className: "h-3 w-3" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleDeletePrivato(p.id), className: "text-red-400 h-7 w-7 p-0", children: _jsx(Trash2, { className: "h-3 w-3" }) })] }) })] }, p.id))), filteredPrivati.length > 100 && (_jsx("tr", { children: _jsxs("td", { colSpan: 7, className: "p-3 text-center text-muted-foreground text-xs", children: ["... e altri ", filteredPrivati.length - 100, " risultati"] }) }))] })] }) }) }) })) : (_jsx(Card, { className: "bg-card/60 border-border/30", children: _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "overflow-x-auto max-h-[500px] overflow-y-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "sticky top-0 bg-card", children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Denominazione" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "P.IVA" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "CF" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Comune" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Indirizzo" })] }) }), _jsx("tbody", { children: filteredAziende.slice(0, 100).map((a) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "p-3 font-medium", children: a.name }), _jsx("td", { className: "p-3 font-mono text-xs text-muted-foreground", children: a.piva }), _jsx("td", { className: "p-3 font-mono text-xs text-muted-foreground", children: a.codice_fiscale || "—" }), _jsx("td", { className: "p-3 text-muted-foreground", children: a.comune || "—" }), _jsx("td", { className: "p-3 text-muted-foreground", children: a.indirizzo || "—" })] }, a.id))) })] }) }) }) })), _jsx(Dialog, { open: showNewPrivato || !!showEditPrivato, onOpenChange: (o) => { if (!o) {
                    setShowNewPrivato(false);
                    setShowEditPrivato(null);
                    resetForm();
                } }, children: _jsxs(DialogContent, { className: "max-w-2xl max-h-[80vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: showEditPrivato ? "Modifica Privato" : "Nuovo Privato" }) }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Nome *" }), _jsx(Input, { value: privatoForm.nome, onChange: (e) => setPrivatoForm(p => ({ ...p, nome: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Cognome *" }), _jsx(Input, { value: privatoForm.cognome, onChange: (e) => setPrivatoForm(p => ({ ...p, cognome: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Codice Fiscale *" }), _jsx(Input, { value: privatoForm.codice_fiscale, onChange: (e) => setPrivatoForm(p => ({ ...p, codice_fiscale: e.target.value.toUpperCase() })), className: "font-mono" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Tipo Utenza" }), _jsxs(Select, { value: privatoForm.tipo_utenza, onValueChange: (v) => setPrivatoForm(p => ({ ...p, tipo_utenza: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "domestica", children: "Domestica" }), _jsx(SelectItem, { value: "non_domestica", children: "Non Domestica" }), _jsx(SelectItem, { value: "produttore_speciali", children: "Produttore Speciali" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Indirizzo" }), _jsx(Input, { value: privatoForm.indirizzo, onChange: (e) => setPrivatoForm(p => ({ ...p, indirizzo: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Comune" }), _jsx(Input, { value: privatoForm.comune_residenza, onChange: (e) => setPrivatoForm(p => ({ ...p, comune_residenza: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "CAP" }), _jsx(Input, { value: privatoForm.cap, onChange: (e) => setPrivatoForm(p => ({ ...p, cap: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Provincia" }), _jsx(Input, { value: privatoForm.provincia, onChange: (e) => setPrivatoForm(p => ({ ...p, provincia: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Telefono" }), _jsx(Input, { value: privatoForm.telefono, onChange: (e) => setPrivatoForm(p => ({ ...p, telefono: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Cellulare" }), _jsx(Input, { value: privatoForm.cellulare, onChange: (e) => setPrivatoForm(p => ({ ...p, cellulare: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Email" }), _jsx(Input, { value: privatoForm.email, onChange: (e) => setPrivatoForm(p => ({ ...p, email: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "PEC" }), _jsx(Input, { value: privatoForm.pec, onChange: (e) => setPrivatoForm(p => ({ ...p, pec: e.target.value })) })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: privatoForm.note, onChange: (e) => setPrivatoForm(p => ({ ...p, note: e.target.value })), rows: 2 })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => { setShowNewPrivato(false); setShowEditPrivato(null); resetForm(); }, children: "Annulla" }), _jsx(Button, { onClick: handleSavePrivato, className: "bg-emerald-600 hover:bg-emerald-700", children: showEditPrivato ? "Aggiorna" : "Registra" })] })] }) })] }));
}
// ─── Report Chiamate ───
function ReportChiamateView() {
    const { data: calls, isLoading } = useQuery({
        queryKey: ["dev-calls-report"],
        queryFn: async () => {
            const { data, error } = await supabase.from("calls").select("*").order("created_at", { ascending: false }).limit(100);
            if (error)
                throw error;
            return data;
        },
    });
    return (_jsxs(Card, { className: "bg-card/60 border-border/30", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-emerald-400 flex items-center gap-2", children: [_jsx(PhoneCall, { className: "h-5 w-5" }), " Report Chiamate (", calls?.length ?? 0, ")"] }) }), _jsx(CardContent, { children: isLoading ? (_jsx("p", { className: "text-muted-foreground text-sm", children: "Caricamento..." })) : !calls?.length ? (_jsx("p", { className: "text-muted-foreground text-sm", children: "Nessuna chiamata registrata" })) : (_jsx("div", { className: "overflow-x-auto max-h-[400px] overflow-y-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "sticky top-0 bg-card", children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Tipo" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Stato" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Durata" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Data" })] }) }), _jsx("tbody", { children: calls.map((c) => {
                                    const duration = c.answered_at && c.ended_at
                                        ? Math.round((new Date(c.ended_at).getTime() - new Date(c.answered_at).getTime()) / 1000)
                                        : null;
                                    return (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "p-3", children: _jsx("span", { className: `px-2 py-0.5 rounded text-xs ${c.call_type === "audio" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`, children: c.call_type }) }), _jsx("td", { className: "p-3", children: _jsx("span", { className: `px-2 py-0.5 rounded text-xs ${c.status === "ended" ? "bg-muted text-muted-foreground" : c.status === "answered" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`, children: c.status }) }), _jsx("td", { className: "p-3 font-mono text-muted-foreground", children: duration != null ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}` : "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: new Date(c.created_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) })] }, c.id));
                                }) })] }) })) })] }));
}
