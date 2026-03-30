import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import logoDragon from "@/assets/dragon-logo-gold.png";
const TENANT_MAP = {
    global: { id: "167d07ad-9184-484e-85a6-da5ceafa42a3", label: "GLOBAL RECO", color: "59, 130, 246" },
    multyproget: { id: "77ec9a3d-a6d4-4235-8e68-1a6f345de57a", label: "MULTYPROGET", color: "249, 115, 22" },
    niyol: { id: "819c783e-4ecf-4774-85b7-7e7a1c5848fa", label: "NIYOL", color: "6, 182, 212" },
};
export default function ImpiantoLoginPage() {
    const navigate = useNavigate();
    const { tenant } = useParams();
    const ctx = TENANT_MAP[tenant || "global"] || TENANT_MAP.global;
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password) {
            toast.error("Inserire email e password");
            return;
        }
        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.functions.invoke("impianto-auth", {
                body: { action: "login", email: email.trim().toLowerCase(), password, tenant_id: ctx.id },
            });
            if (error)
                throw error;
            if (!data?.success)
                throw new Error(data?.error || "Login fallito");
            localStorage.setItem(`impianto_session_${tenant || "global"}`, JSON.stringify(data));
            toast.success(`Benvenuto, ${data.account.ragione_sociale}`);
            navigate(`/area-impianto/${tenant || "global"}/dashboard`);
        }
        catch (err) {
            toast.error(err.message || "Errore di login");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-background flex items-center justify-center p-4", children: _jsxs("div", { className: "w-full max-w-md", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("img", { src: logoDragon, alt: "Logo", className: "h-20 w-20 mx-auto mb-4", style: { filter: `drop-shadow(0 0 16px rgba(${ctx.color}, 0.6))` } }), _jsx("h1", { className: "font-display text-3xl text-foreground tracking-wider mb-2", style: { textShadow: `0 0 20px rgba(${ctx.color}, 0.5)` }, children: "AREA IMPIANTO" }), _jsxs("p", { className: "text-sm uppercase tracking-widest font-bold", style: { color: `rgb(${ctx.color})` }, children: [ctx.label, " \u2014 Accesso Riservato"] })] }), _jsx("div", { className: "bg-card rounded-2xl p-6", style: { boxShadow: `0 0 2px rgba(${ctx.color}, 0.6), 0 0 12px rgba(${ctx.color}, 0.3)`, border: `1px solid rgba(${ctx.color}, 0.3)` }, children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground mb-1 block", children: "Email Impianto" }), _jsxs("div", { className: "relative", children: [_jsx(Mail, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", size: 18 }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "email@impianto.it", autoFocus: true, className: "w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2", style: { ["--tw-ring-color"]: `rgba(${ctx.color}, 0.6)` } })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground mb-1 block", children: "Password" }), _jsxs("div", { className: "relative", children: [_jsx(Lock, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", size: 18 }), _jsx("input", { type: showPassword ? "text" : "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: "w-full pl-10 pr-12 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2", style: { ["--tw-ring-color"]: `rgba(${ctx.color}, 0.6)` } }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground", children: showPassword ? _jsx(EyeOff, { size: 18 }) : _jsx(Eye, { size: 18 }) })] })] }), _jsx("button", { type: "submit", disabled: isSubmitting, className: "w-full py-3 rounded-lg font-display font-semibold tracking-wider text-white transition-all disabled:opacity-50", style: { backgroundColor: `rgb(${ctx.color})` }, children: isSubmitting ? "CARICAMENTO..." : "ACCEDI" })] }) }), _jsxs("p", { className: "text-center text-xs text-muted-foreground mt-6", children: ["Area Impianto ", ctx.label, " \u2022 ZOLI DRAGON"] })] }) }));
}
