import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Lock, Eye, EyeOff, CreditCard, User, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
function getSupabase() {
    return supabase;
}
export default function Auth() {
    const [, navigate] = useLocation();
    const [tab, setTab] = useState("login");
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [cf, setCf] = useState("");
    const [password, setPassword] = useState("");
    const [nome, setNome] = useState("");
    const [cognome, setCognome] = useState("");
    const [targa, setTarga] = useState("");
    const [autistaAlt, setAutistaAlt] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const cfEmail = (codiceFiscale) => `${codiceFiscale.toUpperCase().trim()}@zoli.internal`;
    const handleDriverLogin = useCallback(async () => {
        if (!cf || !password) {
            toast.error("Inserisci codice fiscale e password");
            return;
        }
        setLoading(true);
        try {
            const supabase = await getSupabase();
            const { error } = await supabase.auth.signInWithPassword({ email: cfEmail(cf), password });
            if (error) {
                toast.error(error.message === "Invalid login credentials" ? "Codice fiscale o password errati" : error.message);
            }
            else {
                navigate("/app");
            }
        }
        finally {
            setLoading(false);
        }
    }, [cf, password, navigate]);
    const handleDriverRegister = useCallback(async () => {
        if (!cf || !password || !nome || !cognome) {
            toast.error("Compila tutti i campi obbligatori");
            return;
        }
        if (cf.length !== 16) {
            toast.error("Il codice fiscale deve avere 16 caratteri");
            return;
        }
        if (password.length < 6) {
            toast.error("La password deve avere almeno 6 caratteri");
            return;
        }
        setLoading(true);
        try {
            const supabase = await getSupabase();
            const { data, error } = await supabase.auth.signUp({
                email: cfEmail(cf), password,
                options: { data: { nome, cognome, codice_fiscale: cf.toUpperCase().trim(), targa_automezzo: targa || null, autista_alternativo: autistaAlt || null } },
            });
            if (error) {
                toast.error(error.message);
            }
            else if (data.user) {
                toast.success("Registrazione completata!");
                navigate("/profile/setup");
            }
        }
        finally {
            setLoading(false);
        }
    }, [cf, password, nome, cognome, targa, autistaAlt, navigate]);
    const handleAdminLogin = useCallback(async () => {
        if (!adminEmail || !adminPassword) {
            toast.error("Inserisci email e password");
            return;
        }
        setLoading(true);
        try {
            const supabase = await getSupabase();
            const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
            if (error) {
                toast.error(error.message === "Invalid login credentials" ? "Email o password errati" : error.message);
            }
            else {
                navigate("/admin");
            }
        }
        finally {
            setLoading(false);
        }
    }, [adminEmail, adminPassword, navigate]);
    if (showAdminLogin) {
        return (_jsx("div", { className: "min-h-screen bg-slate-950 flex items-center justify-center p-4", children: _jsxs("div", { className: "w-full max-w-md space-y-6", children: [_jsxs("div", { className: "text-center space-y-2", children: [_jsx("div", { className: "mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/30", children: _jsx(Shield, { className: "h-8 w-8 text-slate-950" }) }), _jsx("h1", { className: "text-3xl font-bold tracking-wider text-amber-400", children: "ZOLI DRAGON" }), _jsx("p", { className: "text-xs tracking-[0.3em] text-slate-500 uppercase", children: "Admin Access" })] }), _jsxs("div", { className: "bg-slate-900/80 border border-slate-700/50 rounded-xl p-6 space-y-4 backdrop-blur", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "admin-email", children: "EMAIL" }), _jsxs("div", { className: "relative", children: [_jsx(Shield, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" }), _jsx(Input, { id: "admin-email", type: "email", placeholder: "admin@zoli.live", value: adminEmail, onChange: e => setAdminEmail(e.target.value), className: "pl-10 bg-slate-800/60 border-slate-700 text-slate-100", onKeyDown: e => e.key === "Enter" && handleAdminLogin() })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "admin-pass", children: "PASSWORD" }), _jsxs("div", { className: "relative", children: [_jsx(Lock, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" }), _jsx(Input, { id: "admin-pass", type: showPassword ? "text" : "password", value: adminPassword, onChange: e => setAdminPassword(e.target.value), className: "pl-10 pr-10 bg-slate-800/60 border-slate-700 text-slate-100", onKeyDown: e => e.key === "Enter" && handleAdminLogin() }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300", children: showPassword ? _jsx(EyeOff, { className: "h-4 w-4" }) : _jsx(Eye, { className: "h-4 w-4" }) })] })] }), _jsx(Button, { onClick: handleAdminLogin, disabled: loading, className: "w-full bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold text-base py-3", children: loading ? "ACCESSO..." : "ACCEDI" })] }), _jsx("button", { onClick: () => setShowAdminLogin(false), className: "flex items-center gap-2 mx-auto text-sm text-slate-500 hover:text-slate-300 transition", children: "\u2190 Torna al login autisti" }), _jsx("p", { className: "text-center text-[10px] tracking-[0.2em] text-slate-600 uppercase font-mono", children: "ZOLI DRAGON V1.0.0 \u2022 RENTRI READY" })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen bg-slate-950 flex items-center justify-center p-4", style: {
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(30,30,50,0.8) 0%, transparent 70%),
        repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(100,100,140,0.05) 49px, rgba(100,100,140,0.05) 50px),
        repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(100,100,140,0.05) 49px, rgba(100,100,140,0.05) 50px)`
        }, children: _jsxs("div", { className: "w-full max-w-md space-y-6", children: [_jsxs("div", { className: "text-center space-y-2", children: [_jsx("div", { className: "mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/30", children: _jsx("span", { className: "text-2xl", children: "\uD83D\uDC09" }) }), _jsx("h1", { className: "text-3xl font-bold tracking-wider text-amber-400", children: "ZOLI DRAGON" }), _jsx("p", { className: "text-xs tracking-[0.3em] text-slate-500 uppercase", children: "Command Core" })] }), _jsxs("div", { className: "bg-slate-900/80 border border-slate-700/50 rounded-xl overflow-hidden backdrop-blur", children: [_jsxs("div", { className: "flex border-b border-slate-700/50", children: [_jsx("button", { onClick: () => setTab("login"), className: `flex-1 py-3 text-sm font-bold tracking-wider transition ${tab === "login" ? "bg-amber-600/20 text-amber-400 border-b-2 border-amber-500" : "text-slate-500 hover:text-slate-300"}`, children: "ACCEDI" }), _jsx("button", { onClick: () => setTab("register"), className: `flex-1 py-3 text-sm font-bold tracking-wider transition ${tab === "register" ? "bg-amber-600/20 text-amber-400 border-b-2 border-amber-500" : "text-slate-500 hover:text-slate-300"}`, children: "REGISTRATI" })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "cf", children: "CODICE FISCALE" }), _jsxs("div", { className: "relative", children: [_jsx(CreditCard, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" }), _jsx(Input, { id: "cf", placeholder: "RSSMRA80A01H501X", value: cf, onChange: e => setCf(e.target.value.toUpperCase()), maxLength: 16, className: "pl-10 bg-slate-800/60 border-slate-700 text-slate-100 uppercase tracking-wider" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "password", children: "PASSWORD" }), _jsxs("div", { className: "relative", children: [_jsx(Lock, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" }), _jsx(Input, { id: "password", type: showPassword ? "text" : "password", value: password, onChange: e => setPassword(e.target.value), className: "pl-10 pr-10 bg-slate-800/60 border-slate-700 text-slate-100", onKeyDown: e => e.key === "Enter" && (tab === "login" ? handleDriverLogin() : handleDriverRegister()) }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300", children: showPassword ? _jsx(EyeOff, { className: "h-4 w-4" }) : _jsx(Eye, { className: "h-4 w-4" }) })] })] }), tab === "register" && (_jsxs("div", { className: "space-y-4 pt-2 border-t border-slate-700/50", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "nome", children: "NOME *" }), _jsxs("div", { className: "relative", children: [_jsx(User, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" }), _jsx(Input, { id: "nome", placeholder: "Mario", value: nome, onChange: e => setNome(e.target.value), className: "pl-10 bg-slate-800/60 border-slate-700 text-slate-100" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "cognome", children: "COGNOME *" }), _jsx(Input, { id: "cognome", placeholder: "Rossi", value: cognome, onChange: e => setCognome(e.target.value), className: "bg-slate-800/60 border-slate-700 text-slate-100" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "targa", children: "TARGA MEZZO" }), _jsx(Input, { id: "targa", placeholder: "AA000BB", value: targa, onChange: e => setTarga(e.target.value.toUpperCase()), className: "bg-slate-800/60 border-slate-700 text-slate-100 uppercase" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "autista-alt", children: "AUTISTA ALT." }), _jsx(Input, { id: "autista-alt", placeholder: "Opzionale", value: autistaAlt, onChange: e => setAutistaAlt(e.target.value), className: "bg-slate-800/60 border-slate-700 text-slate-100" })] })] })] })), _jsx(Button, { onClick: tab === "login" ? handleDriverLogin : handleDriverRegister, disabled: loading, className: "w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-base py-3", children: loading ? "CARICAMENTO..." : tab === "login" ? "ACCEDI" : "REGISTRATI" })] })] }), _jsxs("button", { onClick: () => setShowAdminLogin(true), className: "flex items-center gap-2 mx-auto text-sm text-slate-600 hover:text-slate-400 transition", children: [_jsx(Shield, { className: "h-4 w-4" }), " Accesso Admin"] }), _jsx("p", { className: "text-center text-[10px] tracking-[0.2em] text-slate-600 uppercase font-mono", children: "ZOLI DRAGON V1.0.0 \u2022 RENTRI READY" })] }) }));
}
