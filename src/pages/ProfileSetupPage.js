import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/MobileShell";
import logoDragon from "@/assets/logo-dragon.png";
export default function ProfileSetupPage() {
    const navigate = useNavigate();
    const { user, profile, refreshUserData, isLoading } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        nome: "",
        cognome: "",
        codice_fiscale: "",
        targa_automezzo: "",
    });
    useEffect(() => {
        if (profile) {
            setForm({
                nome: profile.nome || "",
                cognome: profile.cognome || "",
                codice_fiscale: profile.codice_fiscale || "",
                targa_automezzo: profile.targa_automezzo || "",
            });
        }
    }, [profile]);
    useEffect(() => {
        if (!isLoading && !user) {
            navigate("/auth");
        }
    }, [user, isLoading, navigate]);
    // If profile is already complete, redirect
    useEffect(() => {
        if (profile?.nome && profile?.cognome && profile?.codice_fiscale) {
            navigate("/");
        }
    }, [profile, navigate]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user)
            return;
        if (!form.nome.trim() || !form.cognome.trim() || !form.codice_fiscale.trim()) {
            toast.error("Nome, cognome e codice fiscale sono obbligatori");
            return;
        }
        setIsSaving(true);
        try {
            // Check if profile exists
            const { data: existing } = await supabase
                .from("profiles")
                .select("id")
                .eq("user_id", user.id)
                .maybeSingle();
            if (existing) {
                const { error } = await supabase
                    .from("profiles")
                    .update({
                    nome: form.nome.trim(),
                    cognome: form.cognome.trim(),
                    codice_fiscale: form.codice_fiscale.trim().toUpperCase(),
                    targa_automezzo: form.targa_automezzo.trim() || null,
                })
                    .eq("user_id", user.id);
                if (error)
                    throw error;
            }
            else {
                const { error } = await supabase
                    .from("profiles")
                    .insert({
                    user_id: user.id,
                    nome: form.nome.trim(),
                    cognome: form.cognome.trim(),
                    codice_fiscale: form.codice_fiscale.trim().toUpperCase(),
                    targa_automezzo: form.targa_automezzo.trim() || null,
                });
                if (error)
                    throw error;
            }
            await refreshUserData();
            toast.success("Profilo completato!");
            navigate("/");
        }
        catch (err) {
            toast.error(err?.message || "Errore nel salvataggio");
        }
        finally {
            setIsSaving(false);
        }
    };
    if (isLoading) {
        return (_jsx("div", { className: "min-h-screen bg-background flex items-center justify-center", children: _jsx("div", { className: "text-primary animate-pulse text-lg tracking-wider font-display", children: "ZOLI DRAGON" }) }));
    }
    return (_jsx(MobileShell, { children: _jsxs("div", { className: "flex-1 flex flex-col items-center justify-center p-6", children: [_jsx("img", { src: logoDragon, alt: "Zoli Dragon", className: "h-16 w-16 mb-4", style: { filter: 'drop-shadow(0 0 12px rgba(192, 173, 103, 0.5))' } }), _jsx("h1", { className: "text-2xl font-display font-bold text-foreground tracking-wider mb-1", children: "Completa il Profilo" }), _jsx("p", { className: "text-muted-foreground text-sm mb-6", children: "Inserisci i tuoi dati per iniziare" }), _jsxs("form", { onSubmit: handleSubmit, className: "w-full max-w-sm space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1 block", children: "Nome *" }), _jsx("input", { type: "text", value: form.nome, onChange: (e) => setForm({ ...form, nome: e.target.value }), placeholder: "Mario", className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1 block", children: "Cognome *" }), _jsx("input", { type: "text", value: form.cognome, onChange: (e) => setForm({ ...form, cognome: e.target.value }), placeholder: "Rossi", className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1 block", children: "Codice Fiscale *" }), _jsx("input", { type: "text", value: form.codice_fiscale, onChange: (e) => setForm({ ...form, codice_fiscale: e.target.value.toUpperCase() }), placeholder: "RSSMRA80A01H501X", maxLength: 16, className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1 block", children: "Targa Automezzo" }), _jsx("input", { type: "text", value: form.targa_automezzo, onChange: (e) => setForm({ ...form, targa_automezzo: e.target.value.toUpperCase() }), placeholder: "AB123CD", className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase" })] }), _jsx("button", { type: "submit", disabled: isSaving, className: "w-full py-3 rounded-lg bg-primary text-primary-foreground font-display font-semibold tracking-wider hover:brightness-110 transition-all disabled:opacity-50", children: isSaving ? "SALVATAGGIO..." : "COMPLETA PROFILO" })] })] }) }));
}
