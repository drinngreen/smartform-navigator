import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Lock, CreditCard, LockKeyhole } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import logoDragon from "@/assets/logo-dragon.png";
const loginSchema = z.object({
    codiceFiscale: z.string().length(16, "Codice fiscale deve avere 16 caratteri"),
    password: z.string().min(6, "Password deve avere almeno 6 caratteri"),
});
const signupSchema = z.object({
    nome: z.string().min(2, "Nome richiesto"),
    cognome: z.string().min(2, "Cognome richiesto"),
    codiceFiscale: z.string().length(16, "Codice fiscale deve avere 16 caratteri"),
    password: z.string().min(6, "Password deve avere almeno 6 caratteri"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Le password non corrispondono",
    path: ["confirmPassword"],
});
const generateEmailFromCF = (codiceFiscale) => {
    return `${codiceFiscale.toLowerCase()}@zoli.internal`;
};
export default function AuthPage() {
    const navigate = useNavigate();
    const { user, isLoading, signIn, signUp } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        nome: "", cognome: "", codiceFiscale: "", email: "", password: "", confirmPassword: "",
    });
    const [errors, setErrors] = useState({});
    useEffect(() => {
        if (!isLoading && user)
            navigate("/");
    }, [user, isLoading, navigate]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);
        try {
            if (isAdminMode) {
                const { error } = await signIn(formData.email, formData.password);
                if (error) {
                    toast.error(error.message.includes("Invalid login") ? "Email o password non validi" : error.message);
                }
                else {
                    toast.success("Accesso admin effettuato!");
                }
                setIsSubmitting(false);
                return;
            }
            const generatedEmail = generateEmailFromCF(formData.codiceFiscale);
            if (isLogin) {
                const result = loginSchema.safeParse({ codiceFiscale: formData.codiceFiscale, password: formData.password });
                if (!result.success) {
                    const fieldErrors = {};
                    result.error.errors.forEach((err) => { if (err.path[0])
                        fieldErrors[err.path[0]] = err.message; });
                    setErrors(fieldErrors);
                    setIsSubmitting(false);
                    return;
                }
                const { error } = await signIn(generatedEmail, formData.password);
                if (error) {
                    toast.error(error.message.includes("Invalid login") ? "Codice fiscale o password non validi" : error.message);
                }
                else {
                    toast.success("Accesso effettuato!");
                }
            }
            else {
                const result = signupSchema.safeParse(formData);
                if (!result.success) {
                    const fieldErrors = {};
                    result.error.errors.forEach((err) => { if (err.path[0])
                        fieldErrors[err.path[0]] = err.message; });
                    setErrors(fieldErrors);
                    setIsSubmitting(false);
                    return;
                }
                const { error } = await signUp(generatedEmail, formData.password, formData.nome, formData.cognome, formData.codiceFiscale.toUpperCase());
                if (error) {
                    toast.error(error.message.includes("already registered") ? "Codice fiscale già registrato" : error.message);
                }
                else {
                    toast.success("Registrazione completata!");
                }
            }
        }
        catch {
            toast.error("Errore durante l'operazione");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (isLoading) {
        return (_jsx("div", { className: "min-h-screen bg-background flex items-center justify-center", children: _jsx("div", { className: "text-primary animate-pulse text-2xl font-display tracking-wider", children: "ZOLI DRAGON" }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 opacity-5", style: { backgroundImage: "linear-gradient(hsl(var(--primary)/0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.3) 1px, transparent 1px)", backgroundSize: "40px 40px" } }), _jsxs("div", { className: "relative z-10 w-full max-w-md", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("img", { src: logoDragon, alt: "Zoli Dragon", className: "w-20 h-20 mx-auto mb-4", style: { filter: 'drop-shadow(0 0 12px hsl(var(--primary) / 0.5))' } }), _jsx("h1", { className: "text-3xl font-display font-bold text-foreground tracking-wider", children: "ZOLI DRAGON" }), _jsx("p", { className: "text-muted-foreground text-sm mt-1", children: "Command Core" })] }), _jsxs("div", { className: "relative bg-card/80 backdrop-blur-xl border border-border rounded-xl p-6 shadow-2xl", children: [_jsx("div", { className: "absolute inset-0 rounded-xl border border-primary/20 pointer-events-none" }), !isAdminMode && (_jsxs("div", { className: "flex gap-2 mb-6", children: [_jsx("button", { onClick: () => setIsLogin(true), className: `flex-1 py-3 rounded-md text-sm font-display font-semibold transition-all ${isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`, children: "ACCEDI" }), _jsx("button", { onClick: () => setIsLogin(false), className: `flex-1 py-3 rounded-md text-sm font-display font-semibold transition-all ${!isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`, children: "REGISTRATI" })] })), isAdminMode && (_jsxs("div", { className: "mb-6", children: [_jsxs("div", { className: "flex items-center gap-2 text-primary mb-2", children: [_jsx(LockKeyhole, { size: 18 }), _jsx("span", { className: "font-display font-semibold", children: "Accesso Admin" })] }), _jsx("button", { onClick: () => { setIsAdminMode(false); setIsLogin(true); setErrors({}); }, className: "text-xs text-muted-foreground hover:text-foreground transition-colors", children: "\u2190 Torna al login utente" })] })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [isAdminMode && (_jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground mb-1 block", children: "Email" }), _jsxs("div", { className: "relative", children: [_jsx(User, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", size: 18 }), _jsx("input", { type: "email", value: formData.email, onChange: (e) => setFormData({ ...formData, email: e.target.value }), placeholder: "admin@example.com", className: "w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" })] })] })), !isAdminMode && !isLogin && (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground mb-1 block", children: "Nome" }), _jsxs("div", { className: "relative", children: [_jsx(User, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", size: 18 }), _jsx("input", { type: "text", value: formData.nome, onChange: (e) => setFormData({ ...formData, nome: e.target.value }), placeholder: "Mario", className: "w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" })] }), errors.nome && _jsx("p", { className: "text-destructive text-xs mt-1", children: errors.nome })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground mb-1 block", children: "Cognome" }), _jsxs("div", { className: "relative", children: [_jsx(User, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", size: 18 }), _jsx("input", { type: "text", value: formData.cognome, onChange: (e) => setFormData({ ...formData, cognome: e.target.value }), placeholder: "Rossi", className: "w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" })] }), errors.cognome && _jsx("p", { className: "text-destructive text-xs mt-1", children: errors.cognome })] })] })), !isAdminMode && (_jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground mb-1 block", children: "Codice Fiscale" }), _jsxs("div", { className: "relative", children: [_jsx(CreditCard, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", size: 18 }), _jsx("input", { type: "text", value: formData.codiceFiscale, onChange: (e) => setFormData({ ...formData, codiceFiscale: e.target.value.toUpperCase() }), placeholder: "RSSMRA80A01H501X", maxLength: 16, className: "w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase" })] }), errors.codiceFiscale && _jsx("p", { className: "text-destructive text-xs mt-1", children: errors.codiceFiscale })] })), !isAdminMode && !isLogin && (_jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground mb-1 block", children: "Conferma Password" }), _jsxs("div", { className: "relative", children: [_jsx(Lock, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", size: 18 }), _jsx("input", { type: "password", value: formData.confirmPassword, onChange: (e) => setFormData({ ...formData, confirmPassword: e.target.value }), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: "w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" })] }), errors.confirmPassword && _jsx("p", { className: "text-destructive text-xs mt-1", children: errors.confirmPassword })] })), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground mb-1 block", children: "Password" }), _jsxs("div", { className: "relative", children: [_jsx(Lock, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", size: 18 }), _jsx("input", { type: showPassword ? "text" : "password", value: formData.password, onChange: (e) => setFormData({ ...formData, password: e.target.value }), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: "w-full pl-10 pr-12 py-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground", children: showPassword ? _jsx(EyeOff, { size: 18 }) : _jsx(Eye, { size: 18 }) })] }), errors.password && _jsx("p", { className: "text-destructive text-xs mt-1", children: errors.password })] }), _jsx("button", { type: "submit", disabled: isSubmitting, className: "w-full py-3 rounded-lg bg-primary text-primary-foreground font-display font-semibold tracking-wider hover:brightness-110 transition-all disabled:opacity-50", children: isSubmitting ? "CARICAMENTO..." : isAdminMode ? "ACCEDI COME ADMIN" : isLogin ? "ACCEDI" : "REGISTRATI" })] }), !isAdminMode && (_jsxs("button", { onClick: () => { setIsAdminMode(true); setErrors({}); }, className: "flex items-center justify-center gap-2 mx-auto mt-4 text-muted-foreground hover:text-foreground transition-colors text-sm", children: [_jsx(LockKeyhole, { size: 14 }), " Accesso Admin"] }))] }), _jsx("p", { className: "text-center text-xs text-muted-foreground mt-6", children: "ZOLI DRAGON v1.0.0 \u2022 RENTRI Ready" })] })] }));
}
