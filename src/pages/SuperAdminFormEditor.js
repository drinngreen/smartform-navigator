import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Save, FolderOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { FormFieldPalette } from "@/components/superadmin/FormFieldPalette";
import { FormPageCanvas } from "@/components/superadmin/FormPageCanvas";
import logoDragon from "@/assets/logo-dragon.png";
import pag1 from "@/assets/formulario_pag_1.png";
import pag2 from "@/assets/formulario_pag_2.png";
import pag3 from "@/assets/formulario_pag_3.png";
const PAGES = [
    { num: 1, src: pag1 },
    { num: 2, src: pag2 },
    { num: 3, src: pag3 },
];
const DEFAULT_SIZES = {
    date: { w: 10, h: 2.5 },
    time: { w: 8, h: 2.5 },
    short_text: { w: 15, h: 2.5 },
    long_text: { w: 25, h: 4 },
    checkbox: { w: 2.5, h: 2.5 },
};
const ALLOWED_EMAIL = "superadmin@zoli.live";
export default function SuperAdminFormEditor() {
    const { user, isAdmin, isLoading } = useAuth();
    const navigate = useNavigate();
    const [fields, setFields] = useState([]);
    const [selectedFieldId, setSelectedFieldId] = useState(null);
    const [templateId, setTemplateId] = useState(null);
    const [templateName, setTemplateName] = useState("Template FIR");
    const [saving, setSaving] = useState(false);
    const [templates, setTemplates] = useState([]);
    useEffect(() => {
        if (!isLoading) {
            const e = user?.email?.toLowerCase() ?? "";
            if (!user || !isAdmin || e !== ALLOWED_EMAIL) {
                navigate("/superadmin", { replace: true });
            }
        }
    }, [user, isAdmin, isLoading, navigate]);
    // Load template list
    useEffect(() => {
        supabase.from("fir_form_templates").select("id, name").order("created_at", { ascending: false })
            .then(({ data }) => { if (data)
            setTemplates(data); });
    }, []);
    const addField = useCallback((type, page, x, y) => {
        const id = crypto.randomUUID();
        const size = DEFAULT_SIZES[type];
        const newField = {
            id, name: "", type, page, x, y,
            width: size.w, height: size.h, locked: false,
        };
        setFields((prev) => [...prev, newField]);
        setSelectedFieldId(id);
    }, []);
    const updateField = useCallback((updated) => {
        setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    }, []);
    const deleteField = useCallback((id) => {
        setFields((prev) => prev.filter((f) => f.id !== id));
        if (selectedFieldId === id)
            setSelectedFieldId(null);
    }, [selectedFieldId]);
    const handleSave = async () => {
        setSaving(true);
        try {
            const client = supabase;
            if (templateId) {
                const { error } = await client.from("fir_form_templates")
                    .update({ name: templateName, fields, updated_at: new Date().toISOString() })
                    .eq("id", templateId);
                if (error)
                    throw error;
            }
            else {
                const { data, error } = await client.from("fir_form_templates")
                    .insert({ name: templateName, fields })
                    .select("id").single();
                if (error)
                    throw error;
                setTemplateId(data.id);
            }
            toast.success("Template salvato!");
            const { data } = await client.from("fir_form_templates").select("id, name").order("created_at", { ascending: false });
            if (data)
                setTemplates(data);
        }
        catch (err) {
            toast.error("Errore salvataggio: " + err.message);
        }
        finally {
            setSaving(false);
        }
    };
    const handleLoad = async (id) => {
        const { data, error } = await supabase.from("fir_form_templates").select("*").eq("id", id).single();
        if (error || !data) {
            toast.error("Errore caricamento");
            return;
        }
        setTemplateId(data.id);
        setTemplateName(data.name);
        setFields(data.fields || []);
        setSelectedFieldId(null);
        toast.success("Template caricato");
    };
    const handleNew = () => {
        setTemplateId(null);
        setTemplateName("Nuovo Template");
        setFields([]);
        setSelectedFieldId(null);
    };
    if (isLoading) {
        return (_jsx("div", { className: "min-h-screen bg-background flex items-center justify-center", children: _jsx("img", { src: logoDragon, alt: "", className: "h-16 w-16 animate-pulse" }) }));
    }
    const selectedField = fields.find((f) => f.id === selectedFieldId) || null;
    return (_jsxs("div", { className: "h-screen bg-background text-foreground flex flex-col overflow-hidden", children: [_jsxs("header", { className: "border-b border-border bg-card px-4 py-2 flex items-center justify-between shrink-0", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: () => navigate("/super"), className: "p-1.5 rounded hover:bg-secondary/50 transition-colors", children: _jsx(ArrowLeft, { size: 18 }) }), _jsx("span", { className: "font-display text-sm tracking-wider", children: "EDITOR FORMULARIO FIR" }), _jsx("input", { value: templateName, onChange: (e) => setTemplateName(e.target.value), className: "ml-4 px-2 py-1 text-sm bg-secondary/30 border border-border rounded w-48" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: handleNew, className: "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary/50 transition-all", children: [_jsx(Plus, { size: 14 }), " Nuovo"] }), _jsxs("button", { onClick: handleSave, disabled: saving, className: "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50", children: [_jsx(Save, { size: 14 }), " ", saving ? "Salvo..." : "Salva"] })] })] }), _jsxs("div", { className: "flex flex-1 min-h-0", children: [_jsxs("aside", { className: "w-64 border-r border-border bg-card p-4 overflow-y-auto shrink-0 space-y-6", children: [_jsx(FormFieldPalette, {}), selectedField && (_jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "text-sm font-semibold text-muted-foreground uppercase tracking-wider", children: "Propriet\u00E0" }), _jsxs("div", { className: "text-xs space-y-1.5", children: [_jsxs("div", { children: [_jsx("label", { className: "text-muted-foreground", children: "Nome" }), _jsx("input", { value: selectedField.name, onChange: (e) => updateField({ ...selectedField, name: e.target.value }), className: "w-full mt-0.5 px-2 py-1 text-xs bg-secondary/30 border border-border rounded", placeholder: "es: codice_eer" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-muted-foreground", children: "Tipo" }), _jsx("div", { className: "mt-0.5 px-2 py-1 bg-secondary/20 border border-border rounded text-xs", children: selectedField.type })] }), _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-muted-foreground", children: "Pag." }), _jsx("div", { className: "mt-0.5 px-2 py-1 bg-secondary/20 border border-border rounded text-xs", children: selectedField.page })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-muted-foreground", children: "X%" }), _jsx("div", { className: "mt-0.5 px-2 py-1 bg-secondary/20 border border-border rounded text-xs", children: selectedField.x.toFixed(1) })] }), _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-muted-foreground", children: "Y%" }), _jsx("div", { className: "mt-0.5 px-2 py-1 bg-secondary/20 border border-border rounded text-xs", children: selectedField.y.toFixed(1) })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-muted-foreground", children: "W%" }), _jsx("input", { type: "number", step: "0.5", value: selectedField.width.toFixed(1), onChange: (e) => updateField({ ...selectedField, width: Math.max(2, parseFloat(e.target.value) || 2) }), className: "w-full mt-0.5 px-2 py-1 text-xs bg-secondary/30 border border-border rounded" })] }), _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-muted-foreground", children: "H%" }), _jsx("input", { type: "number", step: "0.5", value: selectedField.height.toFixed(1), onChange: (e) => updateField({ ...selectedField, height: Math.max(1, parseFloat(e.target.value) || 1) }), className: "w-full mt-0.5 px-2 py-1 text-xs bg-secondary/30 border border-border rounded" })] })] }), _jsxs("div", { className: "flex items-center gap-2 mt-1", children: [_jsx("label", { className: "text-muted-foreground", children: "Bloccato" }), _jsx("input", { type: "checkbox", checked: selectedField.locked, onChange: (e) => updateField({ ...selectedField, locked: e.target.checked }) })] })] })] })), _jsxs("div", { className: "space-y-2", children: [_jsxs("h3", { className: "text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5", children: [_jsx(FolderOpen, { size: 14 }), " Template Salvati"] }), templates.length === 0 && _jsx("p", { className: "text-xs text-muted-foreground", children: "Nessun template" }), templates.map((t) => (_jsx("button", { onClick: () => handleLoad(t.id), className: `w-full text-left px-2 py-1.5 text-xs rounded border transition-all ${t.id === templateId ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50"}`, children: t.name }, t.id)))] }), _jsxs("div", { className: "text-xs text-muted-foreground", children: [fields.length, " campi posizionati"] })] }), _jsx("main", { className: "flex-1 overflow-y-auto p-4", children: PAGES.map((p) => (_jsx(FormPageCanvas, { pageNumber: p.num, imageSrc: p.src, fields: fields.filter((f) => f.page === p.num), selectedFieldId: selectedFieldId, onSelectField: setSelectedFieldId, onUpdateField: updateField, onDeleteField: deleteField, onAddField: addField }, p.num))) })] })] }));
}
