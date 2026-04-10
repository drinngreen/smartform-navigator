import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ArrowDown, ArrowUp, Plus, Minus, RefreshCw, Scissors, History } from "lucide-react";
import { toast } from "sonner";
import { CER_DATA } from "./DevCERPreferitiModule";
const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
export function DevMagazzinoModule() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [searchCer, setSearchCer] = useState("");
    const [filterTipo, setFilterTipo] = useState("all");
    const [showCarico, setShowCarico] = useState(false);
    const [showScarico, setShowScarico] = useState(false);
    const [showCernita, setShowCernita] = useState(false);
    const [selectedCer, setSelectedCer] = useState("");
    // Carico/Scarico form
    const [opForm, setOpForm] = useState({ cer: "", quantita: "", conferente: "privato", nota: "", fir_numero: "" });
    const [cerSearchInput, setCerSearchInput] = useState("");
    // Cernita wizard
    const [cernitaStep, setCernitaStep] = useState(0);
    const [cernitaInput, setCernitaInput] = useState({ cer: "", quantita: "" });
    const [cernitaOutputs, setCernitaOutputs] = useState([{ cer: "", quantita: "", tipo: "rifiuto" }]);
    // Fetch impianti
    const { data: impianti } = useQuery({
        queryKey: ["dev-impianti-mag", MULTY_TENANT_ID],
        queryFn: async () => {
            const { data, error } = await supabase.from("impianti").select("id, nome").eq("tenant_id", MULTY_TENANT_ID);
            if (error)
                throw error;
            return data;
        },
    });
    const impiantoId = impianti?.[0]?.id;
    // Fetch giacenze
    const { data: giacenze, isLoading } = useQuery({
        queryKey: ["dev-mag-giacenze", MULTY_TENANT_ID],
        queryFn: async () => {
            const { data, error } = await supabase.from("magazzino_giacenze").select("*").eq("tenant_id", MULTY_TENANT_ID).order("cer");
            if (error)
                throw error;
            return data;
        },
    });
    // Fetch movimenti
    const { data: movimenti } = useQuery({
        queryKey: ["dev-mag-movimenti", MULTY_TENANT_ID],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("movimenti_impianto")
                .select("*")
                .eq("tenant_id", MULTY_TENANT_ID)
                .order("data_movimento", { ascending: false })
                .limit(100);
            if (error)
                throw error;
            return data;
        },
    });
    // Fetch cernite
    const { data: cernite } = useQuery({
        queryKey: ["dev-cernite", MULTY_TENANT_ID],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("cernite")
                .select("*, cernita_output(*)")
                .eq("tenant_id", MULTY_TENANT_ID)
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            return data;
        },
    });
    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ["dev-mag-giacenze"] });
        queryClient.invalidateQueries({ queryKey: ["dev-mag-movimenti"] });
        queryClient.invalidateQueries({ queryKey: ["dev-cernite"] });
    };
    // Recalculate
    const recalculate = useMutation({
        mutationFn: async () => {
            if (!movimenti)
                return;
            const stock = {};
            for (const m of movimenti) {
                const key = `${m.impianto_id}_${m.cer}`;
                if (!stock[key])
                    stock[key] = { cer: m.cer, impianto_id: m.impianto_id, carico: 0, scarico: 0 };
                if (m.tipo_movimento === "CARICO")
                    stock[key].carico += Number(m.quantita_kg);
                else
                    stock[key].scarico += Number(m.quantita_kg);
            }
            for (const [, v] of Object.entries(stock)) {
                const qty = v.carico - v.scarico;
                await supabase.from("magazzino_giacenze").upsert({
                    tenant_id: MULTY_TENANT_ID, impianto_id: v.impianto_id, cer: v.cer, quantita_kg: qty, ultimo_carico_at: new Date().toISOString(),
                }, { onConflict: "tenant_id,impianto_id,cer" });
            }
        },
        onSuccess: () => { invalidateAll(); toast.success("Giacenze ricalcolate"); },
        onError: (e) => toast.error("Errore: " + e.message),
    });
    // Save operation
    const saveOperazione = async (tipo, cer, quantita, nota, firNumero) => {
        if (!impiantoId) {
            toast.error("Nessun impianto configurato");
            return;
        }
        // Insert movement
        const { error: movErr } = await supabase.from("movimenti_impianto").insert({
            impianto_id: impiantoId, tenant_id: MULTY_TENANT_ID, cer, quantita_kg: quantita,
            tipo_movimento: tipo, ruolo_impianto: "DESTINATARIO", data_movimento: new Date().toISOString(),
            note: nota || null, numero_fir: firNumero || null, created_by: user?.id,
        });
        if (movErr)
            throw movErr;
        // Upsert giacenza
        const current = giacenze?.find(g => g.cer === cer);
        const newQty = (Number(current?.quantita_kg) || 0) + (tipo === "CARICO" ? quantita : -quantita);
        const { error: gErr } = await supabase.from("magazzino_giacenze").upsert({
            tenant_id: MULTY_TENANT_ID, impianto_id: impiantoId, cer, quantita_kg: newQty,
            ...(tipo === "CARICO" ? { ultimo_carico_at: new Date().toISOString() } : { ultimo_scarico_at: new Date().toISOString() }),
        }, { onConflict: "tenant_id,impianto_id,cer" });
        if (gErr)
            throw gErr;
        invalidateAll();
    };
    const handleSaveCarico = async () => {
        if (!opForm.cer || !opForm.quantita) {
            toast.error("CER e quantità obbligatori");
            return;
        }
        try {
            await saveOperazione("CARICO", opForm.cer, parseFloat(opForm.quantita), opForm.nota, opForm.fir_numero);
            toast.success("✅ Carico registrato");
            setShowCarico(false);
            setOpForm({ cer: "", quantita: "", conferente: "privato", nota: "", fir_numero: "" });
        }
        catch (err) {
            toast.error(err.message);
        }
    };
    const handleSaveScarico = async () => {
        if (!opForm.cer || !opForm.quantita) {
            toast.error("CER e quantità obbligatori");
            return;
        }
        const current = giacenze?.find(g => g.cer === opForm.cer);
        if (parseFloat(opForm.quantita) > (Number(current?.quantita_kg) || 0)) {
            toast.error("Quantità superiore alla giacenza!");
            return;
        }
        try {
            await saveOperazione("SCARICO", opForm.cer, parseFloat(opForm.quantita), opForm.nota, opForm.fir_numero);
            toast.success("✅ Scarico registrato");
            setShowScarico(false);
            setOpForm({ cer: "", quantita: "", conferente: "privato", nota: "", fir_numero: "" });
        }
        catch (err) {
            toast.error(err.message);
        }
    };
    const handleSaveCernita = async () => {
        if (!cernitaInput.cer || !cernitaInput.quantita) {
            toast.error("Input obbligatorio");
            return;
        }
        const validOutputs = cernitaOutputs.filter(o => o.cer && o.quantita);
        if (validOutputs.length === 0) {
            toast.error("Almeno un output obbligatorio");
            return;
        }
        const inputKg = parseFloat(cernitaInput.quantita);
        const outputKg = validOutputs.reduce((s, o) => s + parseFloat(o.quantita), 0);
        const diff = Math.abs(inputKg - outputKg) / inputKg;
        if (outputKg > inputKg) {
            toast.error("Output supera l'input!");
            return;
        }
        try {
            // Create cernita record
            const { data: cernitaData, error: cernitaErr } = await supabase.from("cernite")
                .insert({ tenant_id: MULTY_TENANT_ID, impianto_id: impiantoId, cer_input: cernitaInput.cer, quantita_input: inputKg, stato: "completata", created_by: user?.id })
                .select("id").single();
            if (cernitaErr)
                throw cernitaErr;
            const cernitaId = cernitaData.id;
            // Insert outputs
            const outputRows = validOutputs.map(o => ({ cernita_id: cernitaId, cer_output: o.cer, quantita: parseFloat(o.quantita), tipo_output: o.tipo }));
            const { error: outErr } = await supabase.from("cernita_output").insert(outputRows);
            if (outErr)
                throw outErr;
            // Scarico input
            await saveOperazione("SCARICO", cernitaInput.cer, inputKg, `Cernita ${cernitaId}`);
            // Carico outputs
            for (const o of validOutputs) {
                await saveOperazione("CARICO", o.cer, parseFloat(o.quantita), `Cernita ${cernitaId} — ${o.tipo}`);
            }
            toast.success("✅ Cernita completata!");
            setShowCernita(false);
            setCernitaStep(0);
            setCernitaInput({ cer: "", quantita: "" });
            setCernitaOutputs([{ cer: "", quantita: "", tipo: "rifiuto" }]);
        }
        catch (err) {
            toast.error(err.message);
        }
    };
    // Filtered
    const filteredGiacenze = useMemo(() => {
        return giacenze?.filter(g => {
            if (searchCer && !g.cer.includes(searchCer))
                return false;
            if (filterTipo === "privato" && !g.cer.startsWith("20"))
                return false;
            if (filterTipo === "azienda" && g.cer.startsWith("20"))
                return false;
            return true;
        });
    }, [giacenze, searchCer, filterTipo]);
    const totaleKg = filteredGiacenze?.reduce((s, g) => s + Number(g.quantita_kg), 0) ?? 0;
    const positiveCers = filteredGiacenze?.filter(g => Number(g.quantita_kg) > 0).length ?? 0;
    const movimentiOggi = movimenti?.filter(m => new Date(m.data_movimento).toDateString() === new Date().toDateString()).length ?? 0;
    const filteredCerList = useMemo(() => {
        if (!cerSearchInput)
            return CER_DATA.slice(0, 15);
        const s = cerSearchInput.toLowerCase();
        return CER_DATA.filter(c => c.codice.includes(s) || c.descrizione.toLowerCase().includes(s)).slice(0, 15);
    }, [cerSearchInput]);
    const openCarico = (cer) => {
        setOpForm({ cer: cer || "", quantita: "", conferente: "privato", nota: "", fir_numero: "" });
        setCerSearchInput(cer || "");
        setShowCarico(true);
    };
    const openScarico = (cer) => {
        setOpForm({ cer: cer || "", quantita: "", conferente: "privato", nota: "", fir_numero: "" });
        setCerSearchInput(cer || "");
        setShowScarico(true);
    };
    const openCernita = (cer) => {
        setCernitaStep(0);
        setCernitaInput({ cer: cer || "", quantita: "" });
        setCernitaOutputs([{ cer: "", quantita: "", tipo: "rifiuto" }]);
        setShowCernita(true);
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs(Tabs, { defaultValue: "giacenze", children: [_jsxs(TabsList, { className: "bg-card/60 border border-border/30 p-1", children: [_jsxs(TabsTrigger, { value: "giacenze", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(Package, { className: "h-4 w-4" }), " Giacenze"] }), _jsxs(TabsTrigger, { value: "cernita", className: "gap-2 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400", children: [_jsx(Scissors, { className: "h-4 w-4" }), " Cernita"] }), _jsxs(TabsTrigger, { value: "storico", className: "gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400", children: [_jsx(History, { className: "h-4 w-4" }), " Storico"] })] }), _jsxs(TabsContent, { value: "giacenze", className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Package, { className: "h-8 w-8 text-emerald-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "CER in Stock" }), _jsx("p", { className: "text-2xl font-bold text-emerald-400", children: positiveCers })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(ArrowDown, { className: "h-8 w-8 text-blue-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Totale in Giacenza" }), _jsxs("p", { className: "text-2xl font-bold text-blue-400", children: [totaleKg.toLocaleString("it-IT"), " kg"] })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(ArrowUp, { className: "h-8 w-8 text-amber-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Movimenti Oggi" }), _jsx("p", { className: "text-2xl font-bold text-amber-400", children: movimentiOggi })] })] }) })] }), _jsxs("div", { className: "flex gap-2 flex-wrap", children: [_jsx(Input, { placeholder: "Filtra per CER...", value: searchCer, onChange: e => setSearchCer(e.target.value), className: "max-w-xs bg-card/60 border-border/50" }), _jsxs(Select, { value: filterTipo, onValueChange: (v) => setFilterTipo(v), children: [_jsx(SelectTrigger, { className: "w-40 bg-card/60 border-border/50", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "Tutti" }), _jsx(SelectItem, { value: "privato", children: "Privati (200xxx)" }), _jsx(SelectItem, { value: "azienda", children: "Aziende" })] })] }), _jsxs(Button, { variant: "outline", onClick: () => openCarico(), className: "gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(Plus, { className: "h-4 w-4" }), " Carico"] }), _jsxs(Button, { variant: "outline", onClick: () => openScarico(), className: "gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10", children: [_jsx(Minus, { className: "h-4 w-4" }), " Scarico"] }), _jsxs(Button, { variant: "outline", onClick: () => openCernita(), className: "gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10", children: [_jsx(Scissors, { className: "h-4 w-4" }), " Cernita"] }), _jsxs(Button, { variant: "outline", onClick: () => recalculate.mutate(), disabled: recalculate.isPending, className: "gap-2 border-border/50 text-muted-foreground hover:text-foreground", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), " Ricalcola"] })] }), _jsx(Card, { className: "bg-card/60 border-border/30", children: _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left py-3 px-4", children: "CER" }), _jsx("th", { className: "text-left py-3 px-4", children: "Tipo" }), _jsx("th", { className: "text-right py-3 px-4", children: "Giacenza (kg)" }), _jsx("th", { className: "text-left py-3 px-4", children: "Stato" }), _jsx("th", { className: "text-right py-3 px-4", children: "Azioni" })] }) }), _jsx("tbody", { children: isLoading ? _jsx("tr", { children: _jsx("td", { colSpan: 5, className: "py-8 text-center text-muted-foreground", children: "Caricamento..." }) })
                                                        : !filteredGiacenze?.length ? _jsx("tr", { children: _jsx("td", { colSpan: 5, className: "py-8 text-center text-muted-foreground", children: "Nessuna giacenza. Clicca \"Ricalcola\" o registra un carico." }) })
                                                            : filteredGiacenze.map(g => {
                                                                const qty = Number(g.quantita_kg);
                                                                const tipo = g.cer.startsWith("20") ? "privato" : "azienda";
                                                                return (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "py-2 px-4 font-mono text-emerald-300", children: g.cer }), _jsx("td", { className: "py-2 px-4", children: _jsx("span", { className: `px-2 py-0.5 rounded-full text-[10px] font-mono ${tipo === "privato" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"}`, children: tipo }) }), _jsx("td", { className: `py-2 px-4 text-right font-bold font-mono ${qty > 0 ? "text-emerald-400" : qty < 0 ? "text-red-400" : "text-muted-foreground"}`, children: qty.toLocaleString("it-IT") }), _jsx("td", { className: "py-2 px-4", children: _jsx("span", { className: `px-2 py-0.5 rounded-full text-[10px] ${qty > 0 ? "bg-emerald-500/15 text-emerald-400" : qty === 0 ? "bg-muted/30 text-muted-foreground" : "bg-red-500/15 text-red-400"}`, children: qty > 0 ? "In stock" : qty === 0 ? "Vuoto" : "Negativo" }) }), _jsx("td", { className: "py-2 px-4 text-right", children: _jsxs("div", { className: "flex gap-1 justify-end", children: [_jsx("button", { onClick: () => openCarico(g.cer), className: "px-2 py-1 rounded text-[10px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20", children: "+ Carico" }), _jsx("button", { onClick: () => openScarico(g.cer), className: "px-2 py-1 rounded text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20", disabled: qty <= 0, children: "- Scarico" }), _jsx("button", { onClick: () => openCernita(g.cer), className: "px-2 py-1 rounded text-[10px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20", disabled: qty <= 0, children: "Cernita" })] }) })] }, g.id));
                                                            }) })] }) }) }) })] }), _jsxs(TabsContent, { value: "cernita", className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h3", { className: "text-lg font-display text-amber-400", children: "Storico Cernite" }), _jsxs(Button, { variant: "outline", onClick: () => openCernita(), className: "gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10", children: [_jsx(Scissors, { className: "h-4 w-4" }), " Nuova Cernita"] })] }), _jsx(Card, { className: "bg-card/60 border-border/30", children: _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left py-3 px-4", children: "Data" }), _jsx("th", { className: "text-left py-3 px-4", children: "CER Input" }), _jsx("th", { className: "text-right py-3 px-4", children: "Kg Input" }), _jsx("th", { className: "text-left py-3 px-4", children: "Output" }), _jsx("th", { className: "text-left py-3 px-4", children: "Stato" })] }) }), _jsx("tbody", { children: !cernite?.length ? _jsx("tr", { children: _jsx("td", { colSpan: 5, className: "py-8 text-center text-muted-foreground", children: "Nessuna cernita registrata" }) })
                                                        : cernite.map((c) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "py-2 px-4 text-xs text-muted-foreground", children: new Date(c.created_at).toLocaleDateString("it-IT") }), _jsx("td", { className: "py-2 px-4 font-mono text-amber-300", children: c.cer_input }), _jsx("td", { className: "py-2 px-4 text-right font-mono font-bold", children: Number(c.quantita_input).toLocaleString("it-IT") }), _jsx("td", { className: "py-2 px-4 text-xs", children: (c.cernita_output || []).map((o, i) => (_jsxs("span", { className: "inline-block mr-2 px-1.5 py-0.5 rounded bg-card/60 border border-border/20 font-mono", children: [o.cer_output, ": ", Number(o.quantita).toLocaleString("it-IT"), "kg ", _jsxs("span", { className: "text-muted-foreground", children: ["(", o.tipo_output, ")"] })] }, i))) }), _jsx("td", { className: "py-2 px-4", children: _jsx("span", { className: `px-2 py-0.5 rounded-full text-[10px] ${c.stato === "completata" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`, children: c.stato }) })] }, c.id))) })] }) }) }) })] }), _jsx(TabsContent, { value: "storico", className: "space-y-4", children: _jsxs(Card, { className: "bg-card/60 border-border/30", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-blue-400 flex items-center gap-2", children: [_jsx(History, { className: "h-5 w-5" }), " Ultimi 100 Movimenti"] }) }), _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left py-3 px-4", children: "Data" }), _jsx("th", { className: "text-left py-3 px-4", children: "Tipo" }), _jsx("th", { className: "text-left py-3 px-4", children: "CER" }), _jsx("th", { className: "text-right py-3 px-4", children: "Kg" }), _jsx("th", { className: "text-left py-3 px-4", children: "Note" })] }) }), _jsx("tbody", { children: !movimenti?.length ? _jsx("tr", { children: _jsx("td", { colSpan: 5, className: "py-8 text-center text-muted-foreground", children: "Nessun movimento" }) })
                                                        : movimenti.map((m) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "py-2 px-4 text-xs text-muted-foreground font-mono", children: new Date(m.data_movimento).toLocaleDateString("it-IT") }), _jsx("td", { className: "py-2 px-4", children: _jsx("span", { className: `px-2 py-0.5 rounded-full text-[10px] font-mono ${m.tipo_movimento === "CARICO" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`, children: m.tipo_movimento }) }), _jsx("td", { className: "py-2 px-4 font-mono text-emerald-300", children: m.cer }), _jsx("td", { className: "py-2 px-4 text-right font-mono font-bold", children: Number(m.quantita_kg).toLocaleString("it-IT") }), _jsx("td", { className: "py-2 px-4 text-xs text-muted-foreground truncate max-w-[200px]", children: m.note || "—" })] }, m.id))) })] }) }) })] }) })] }), _jsx(Dialog, { open: showCarico, onOpenChange: setShowCarico, children: _jsxs(DialogContent, { className: "bg-card border-emerald-500/30 max-w-md", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "text-emerald-400 flex items-center gap-2", children: [_jsx(Plus, { className: "h-5 w-5" }), " Registra Carico"] }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Codice CER *" }), _jsx(Input, { value: opForm.cer, onChange: e => { setOpForm(f => ({ ...f, cer: e.target.value })); setCerSearchInput(e.target.value); }, placeholder: "Es. 200101", className: "font-mono bg-background/80 border-border/30" }), cerSearchInput && filteredCerList.length > 0 && (_jsx("div", { className: "mt-1 max-h-32 overflow-y-auto border border-border/20 rounded-lg bg-card", children: filteredCerList.map(c => (_jsxs("button", { onClick: () => { setOpForm(f => ({ ...f, cer: c.codice })); setCerSearchInput(""); }, className: "w-full text-left px-3 py-1.5 text-xs hover:bg-primary/10 text-foreground", children: [_jsx("span", { className: "font-mono text-emerald-300", children: c.codice }), " \u2014 ", c.descrizione.slice(0, 60)] }, c.codice))) }))] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Quantit\u00E0 (kg) *" }), _jsx(Input, { type: "number", value: opForm.quantita, onChange: e => setOpForm(f => ({ ...f, quantita: e.target.value })), className: "font-mono bg-background/80 border-border/30" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "N\u00B0 FIR (opzionale)" }), _jsx(Input, { value: opForm.fir_numero, onChange: e => setOpForm(f => ({ ...f, fir_numero: e.target.value })), className: "font-mono bg-background/80 border-border/30" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Note" }), _jsx(Textarea, { value: opForm.nota, onChange: e => setOpForm(f => ({ ...f, nota: e.target.value })), className: "bg-background/80 border-border/30", rows: 2 })] })] }), _jsx(DialogFooter, { children: _jsx(Button, { onClick: handleSaveCarico, className: "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30", children: "Salva Carico" }) })] }) }), _jsx(Dialog, { open: showScarico, onOpenChange: setShowScarico, children: _jsxs(DialogContent, { className: "bg-card border-red-500/30 max-w-md", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "text-red-400 flex items-center gap-2", children: [_jsx(Minus, { className: "h-5 w-5" }), " Registra Scarico"] }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Codice CER *" }), _jsx(Input, { value: opForm.cer, onChange: e => { setOpForm(f => ({ ...f, cer: e.target.value })); setCerSearchInput(e.target.value); }, placeholder: "Es. 200101", className: "font-mono bg-background/80 border-border/30" }), opForm.cer && _jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: ["Giacenza attuale: ", _jsxs("span", { className: "font-bold text-foreground", children: [(Number(giacenze?.find(g => g.cer === opForm.cer)?.quantita_kg) || 0).toLocaleString("it-IT"), " kg"] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Quantit\u00E0 (kg) *" }), _jsx(Input, { type: "number", value: opForm.quantita, onChange: e => setOpForm(f => ({ ...f, quantita: e.target.value })), className: "font-mono bg-background/80 border-border/30" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "N\u00B0 FIR (opzionale)" }), _jsx(Input, { value: opForm.fir_numero, onChange: e => setOpForm(f => ({ ...f, fir_numero: e.target.value })), className: "font-mono bg-background/80 border-border/30" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Note" }), _jsx(Textarea, { value: opForm.nota, onChange: e => setOpForm(f => ({ ...f, nota: e.target.value })), className: "bg-background/80 border-border/30", rows: 2 })] })] }), _jsx(DialogFooter, { children: _jsx(Button, { onClick: handleSaveScarico, className: "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30", children: "Salva Scarico" }) })] }) }), _jsx(Dialog, { open: showCernita, onOpenChange: setShowCernita, children: _jsxs(DialogContent, { className: "bg-card border-amber-500/30 max-w-lg max-h-[90vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "text-amber-400 flex items-center gap-2", children: [_jsx(Scissors, { className: "h-5 w-5" }), " Nuova Cernita \u2014 Step ", cernitaStep + 1, "/3"] }) }), cernitaStep === 0 && (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Seleziona il CER in ingresso e la quantit\u00E0 da lavorare." }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "CER Input *" }), _jsx(Input, { value: cernitaInput.cer, onChange: e => setCernitaInput(f => ({ ...f, cer: e.target.value })), placeholder: "Es. 200301", className: "font-mono bg-background/80 border-border/30" }), cernitaInput.cer && _jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: ["Giacenza: ", _jsxs("span", { className: "font-bold", children: [(Number(giacenze?.find(g => g.cer === cernitaInput.cer)?.quantita_kg) || 0).toLocaleString("it-IT"), " kg"] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Quantit\u00E0 (kg) *" }), _jsx(Input, { type: "number", value: cernitaInput.quantita, onChange: e => setCernitaInput(f => ({ ...f, quantita: e.target.value })), className: "font-mono bg-background/80 border-border/30" })] }), _jsx(Button, { onClick: () => { if (!cernitaInput.cer || !cernitaInput.quantita) {
                                        toast.error("Compila i campi");
                                        return;
                                    } setCernitaStep(1); }, className: "bg-amber-500/20 border border-amber-500/30 text-amber-400 w-full", children: "Avanti \u2192" })] })), cernitaStep === 1 && (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Aggiungi le frazioni di output dalla cernita." }), cernitaOutputs.map((o, i) => (_jsxs("div", { className: "flex gap-2 items-end", children: [_jsxs("div", { className: "flex-1", children: [_jsx(Label, { className: "text-[10px] text-muted-foreground", children: "CER" }), _jsx(Input, { value: o.cer, onChange: e => { const arr = [...cernitaOutputs]; arr[i].cer = e.target.value; setCernitaOutputs(arr); }, placeholder: "CER", className: "font-mono text-xs bg-background/80 border-border/30" })] }), _jsxs("div", { className: "w-24", children: [_jsx(Label, { className: "text-[10px] text-muted-foreground", children: "Kg" }), _jsx(Input, { type: "number", value: o.quantita, onChange: e => { const arr = [...cernitaOutputs]; arr[i].quantita = e.target.value; setCernitaOutputs(arr); }, className: "font-mono text-xs bg-background/80 border-border/30" })] }), _jsxs("div", { className: "w-28", children: [_jsx(Label, { className: "text-[10px] text-muted-foreground", children: "Tipo" }), _jsxs(Select, { value: o.tipo, onValueChange: v => { const arr = [...cernitaOutputs]; arr[i].tipo = v; setCernitaOutputs(arr); }, children: [_jsx(SelectTrigger, { className: "text-xs bg-background/80 border-border/30", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "rifiuto", children: "Rifiuto" }), _jsx(SelectItem, { value: "mps", children: "MPS" }), _jsx(SelectItem, { value: "eow", children: "EOW" })] })] })] }), cernitaOutputs.length > 1 && _jsx("button", { onClick: () => setCernitaOutputs(arr => arr.filter((_, j) => j !== i)), className: "text-red-400 text-xs pb-2", children: "\u2715" })] }, i))), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => setCernitaOutputs(arr => [...arr, { cer: "", quantita: "", tipo: "rifiuto" }]), className: "gap-1 text-xs", children: [_jsx(Plus, { className: "h-3 w-3" }), " Aggiungi Output"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", onClick: () => setCernitaStep(0), className: "flex-1", children: "\u2190 Indietro" }), _jsx(Button, { onClick: () => setCernitaStep(2), className: "flex-1 bg-amber-500/20 border border-amber-500/30 text-amber-400", children: "Avanti \u2192" })] })] })), cernitaStep === 2 && (() => {
                            const inputKg = parseFloat(cernitaInput.quantita) || 0;
                            const validOutputs = cernitaOutputs.filter(o => o.cer && o.quantita);
                            const outputKg = validOutputs.reduce((s, o) => s + (parseFloat(o.quantita) || 0), 0);
                            const diff = inputKg > 0 ? ((inputKg - outputKg) / inputKg * 100) : 0;
                            return (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Verifica il bilancio prima di confermare." }), _jsxs("div", { className: "rounded-lg bg-background/80 p-4 space-y-2 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Input:" }), _jsxs("span", { className: "font-mono font-bold", children: [cernitaInput.cer, " \u2014 ", inputKg.toLocaleString("it-IT"), " kg"] })] }), _jsx("div", { className: "border-t border-border/20 pt-2", children: validOutputs.map((o, i) => (_jsxs("div", { className: "flex justify-between text-xs", children: [_jsx("span", { className: "font-mono", children: o.cer }), _jsxs("span", { children: [parseFloat(o.quantita).toLocaleString("it-IT"), " kg (", o.tipo, ")"] })] }, i))) }), _jsxs("div", { className: "border-t border-border/20 pt-2 flex justify-between font-bold", children: [_jsx("span", { children: "Totale Output:" }), _jsxs("span", { className: "font-mono", children: [outputKg.toLocaleString("it-IT"), " kg"] })] }), _jsxs("div", { className: `flex justify-between ${diff > 5 ? "text-amber-400" : diff > 0 ? "text-muted-foreground" : "text-emerald-400"}`, children: [_jsx("span", { children: "Scarto:" }), _jsxs("span", { className: "font-mono", children: [(inputKg - outputKg).toLocaleString("it-IT"), " kg (", diff.toFixed(1), "%)"] })] }), diff > 5 && _jsx("p", { className: "text-amber-400 text-xs", children: "\u26A0\uFE0F Scarto superiore al 5%" }), outputKg > inputKg && _jsx("p", { className: "text-red-400 text-xs", children: "\u274C L'output supera l'input!" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", onClick: () => setCernitaStep(1), className: "flex-1", children: "\u2190 Indietro" }), _jsx(Button, { onClick: handleSaveCernita, disabled: outputKg > inputKg, className: "flex-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400", children: "\u2705 Conferma Cernita" })] })] }));
                        })()] }) })] }));
}
