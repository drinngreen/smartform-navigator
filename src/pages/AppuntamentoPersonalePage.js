import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
export default function AppuntamentoPersonalePage() {
    const [persone, setPersone] = useState([]);
    const [saving, setSaving] = useState({});
    useEffect(() => {
        supabase
            .from("appuntamenti_personale")
            .select("*")
            .order("created_at")
            .then(({ data }) => {
            if (data)
                setPersone(data);
        });
    }, []);
    const save = useCallback(async (id, field, value) => {
        setSaving((s) => ({ ...s, [id + field]: true }));
        await supabase
            .from("appuntamenti_personale")
            .update({ [field]: value, updated_at: new Date().toISOString() })
            .eq("id", id);
        setSaving((s) => ({ ...s, [id + field]: false }));
    }, []);
    const update = (id, field, value) => {
        setPersone((p) => p.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
    };
    return (_jsx("div", { className: "min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsx("h1", { className: "text-2xl md:text-3xl font-bold text-center mb-2", children: "\uD83D\uDCC5 Appuntamento con Riccardo" }), _jsxs("p", { className: "text-center text-slate-400 mb-1 text-sm", children: ["Periodo: ", _jsx("span", { className: "text-amber-400 font-semibold", children: "Gioved\u00EC 12 Marzo \u2013 Venerd\u00EC 20 Marzo 2026" })] }), _jsx("p", { className: "text-center text-slate-500 mb-6 text-xs", children: "Scrivi la tua disponibilit\u00E0 oraria. Riccardo risponder\u00E0 nel campo giallo." }), _jsx("div", { className: "space-y-4", children: persone.map((p) => (_jsxs("div", { className: "bg-slate-900/80 border border-slate-800 rounded-xl p-4", children: [_jsx("div", { className: "font-semibold text-lg text-emerald-400 mb-3", children: p.nome }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-400 mb-1 block", children: "Disponibilit\u00E0 oraria per appuntamento" }), _jsx("textarea", { className: "w-full rounded-lg border border-slate-700 bg-slate-800/80 text-slate-100 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600", placeholder: "Es: Luned\u00EC 17 marzo ore 10-12, Mercoled\u00EC 19 marzo pomeriggio...", value: p.messaggio_disponibilita, onChange: (e) => update(p.id, "messaggio_disponibilita", e.target.value), onBlur: (e) => save(p.id, "messaggio_disponibilita", e.target.value) }), saving[p.id + "messaggio_disponibilita"] && (_jsx("span", { className: "text-xs text-emerald-500", children: "Salvataggio..." }))] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-amber-400 mb-1 block", children: "Risposta di Riccardo" }), _jsx("textarea", { className: "w-full rounded-lg border border-amber-700/50 bg-amber-950/40 text-amber-100 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-amber-800", placeholder: "Riccardo scriver\u00E0 qui...", value: p.risposta_riccardo, onChange: (e) => update(p.id, "risposta_riccardo", e.target.value), onBlur: (e) => save(p.id, "risposta_riccardo", e.target.value) }), saving[p.id + "risposta_riccardo"] && (_jsx("span", { className: "text-xs text-amber-500", children: "Salvataggio..." }))] })] })] }, p.id))) })] }) }));
}
