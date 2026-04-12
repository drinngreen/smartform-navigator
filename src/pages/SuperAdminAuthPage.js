import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import logoDragon from "@/assets/logo-dragon.png";
const ALLOWED_EMAIL = "superadmin@zoli.live";
export default function SuperAdminAuthPage() {
    const navigate = useNavigate();
    const { user, isAdmin, isLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    useEffect(() => {
        if (!isLoading && user) {
            const e = user.email?.toLowerCase() ?? "";
            if (e === ALLOWED_EMAIL && isAdmin) {
                navigate("/super", { replace: true });
            }
        }
    }, [user, isAdmin, isLoading, navigate]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (email.toLowerCase() !== ALLOWED_EMAIL) {
            toast.error("Accesso consentito solo a superadmin@zoli.live");
            return;
        }
        setIsSubmitting(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            toast.error("Credenziali non valide");
        }
        else {
            toast.success("Accesso Super Admin!");
            navigate("/super", { replace: true });
        }
        setIsSubmitting(false);
    };
    if (isLoading) {
        return (_jsx("div", { className: "min-h-screen bg-background flex items-center justify-center", children: _jsx("img", { src: logoDragon, alt: "Logo", className: "h-20 w-20 animate-pulse" }) }));
    }
    return (_jsx("div", { className: "min-h-screen bg-background flex items-center justify-center p-4", children: _jsxs("div", { className: "w-full max-w-md", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsxs("div", { className: "relative inline-block mb-4", children: [_jsx("img", { src: logoDragon, alt: "Logo", className: "h-20 w-20", style: { filter: "drop-shadow(0 0 16px rgba(239, 68, 68, 0.6))" } }), _jsx(Shield, { className: "absolute -top-2 -right-2 text-red-500", size: 28 })] }), _jsx("h1", { className: "font-display text-3xl text-foreground tracking-wider mb-2", style: { textShadow: "0 0 20px rgba(239, 68, 68, 0.5)" }, children: "SUPER ADMIN" }), _jsx("p", { className: "text-red-400 text-sm uppercase tracking-widest font-bold", children: "Accesso Riservato" })] }), _jsx("div", { className: "bg-card rounded-2xl p-6", style: { boxShadow: "0 0 2px hsl(0, 84%, 60%), 0 0 12px rgba(239, 68, 68, 0.3)", border: "1px solid rgba(239, 68, 68, 0.3)" }, children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground mb-1 block", children: "Email" }), _jsxs("div", { className: "relative", children: [_jsx(Mail, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", size: 18 }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "superadmin@zoli.live", className: "w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground mb-1 block", children: "Password" }), _jsxs("div", { className: "relative", children: [_jsx(Lock, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", size: 18 }), _jsx("input", { type: showPassword ? "text" : "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: "w-full pl-10 pr-12 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500" }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground", children: showPassword ? _jsx(EyeOff, { size: 18 }) : _jsx(Eye, { size: 18 }) })] })] }), _jsx("button", { type: "submit", disabled: isSubmitting, className: "w-full py-3 rounded-lg font-display font-semibold tracking-wider bg-red-600 text-white hover:bg-red-500 transition-all disabled:opacity-50", children: isSubmitting ? "CARICAMENTO..." : "ACCEDI SUPER ADMIN" })] }) }), _jsx("p", { className: "text-center text-xs text-muted-foreground mt-6", children: "Super Admin \u2022 ZOLI DRAGON" })] }) }));
}
