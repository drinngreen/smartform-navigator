import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Loader2, Printer } from "lucide-react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
export default function MNDevGuidaPage() {
    const navigate = useNavigate();
    const [guideMd, setGuideMd] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        fetch("/guida-dev-multy.md")
            .then((res) => {
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            return res.text();
        })
            .then((text) => {
            setGuideMd(text);
            setLoading(false);
        })
            .catch((err) => {
            setError(err.message || "Errore caricamento guida");
            setLoading(false);
        });
    }, []);
    return (_jsxs(MNAdminLayout, { title: "\uD83D\uDCD8 Guida Dev Multy", subtitle: "Multyproget \u00B7 Istruzioni operative complete", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between gap-3 print:hidden", children: [_jsxs(Button, { variant: "ghost", onClick: () => navigate("/mn/admin/dev-multyproget"), className: "gap-2 text-muted-foreground hover:text-foreground", children: [_jsx(ArrowLeft, { size: 16 }), "Torna al Centro di Comando"] }), _jsxs(Button, { onClick: () => window.print(), className: "gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg", size: "lg", children: [_jsx(Printer, { size: 18 }), "\uD83D\uDDA8\uFE0F Stampa guida"] })] }), _jsxs("div", { className: "rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-6 md:p-8 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-3 mb-6 pb-4 border-b border-border/30", children: [_jsx(BookOpen, { className: "h-6 w-6 text-emerald-400" }), _jsxs("div", { children: [_jsx("h1", { className: "text-lg font-semibold text-foreground", children: "Guida Completa \u2014 Dev Multy" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Documento aggiornato: tutti i moduli, le regole e la troubleshooting rapida." })] })] }), loading && (_jsxs("div", { className: "flex items-center gap-3 py-12 justify-center text-muted-foreground", children: [_jsx(Loader2, { className: "h-5 w-5 animate-spin" }), _jsx("span", { className: "text-sm", children: "Caricamento guida..." })] })), error && (_jsxs("div", { className: "p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm", children: ["Errore caricamento guida: ", error] })), !loading && !error && (_jsx("article", { className: "prose prose-invert max-w-none text-sm text-foreground/90", children: _jsx(ReactMarkdown, { components: {
                                h1: ({ children }) => _jsx("h1", { className: "text-2xl font-bold mt-8 mb-4 text-emerald-300", children: children }),
                                h2: ({ children }) => _jsx("h2", { className: "text-xl font-semibold mt-6 mb-3 text-emerald-200 border-b border-border/20 pb-1", children: children }),
                                h3: ({ children }) => _jsx("h3", { className: "text-lg font-semibold mt-5 mb-2 text-foreground", children: children }),
                                h4: ({ children }) => _jsx("h4", { className: "text-base font-semibold mt-4 mb-2 text-foreground/90", children: children }),
                                p: ({ children }) => _jsx("p", { className: "mb-3 leading-relaxed text-muted-foreground", children: children }),
                                ul: ({ children }) => _jsx("ul", { className: "list-disc pl-5 mb-4 space-y-1 text-muted-foreground", children: children }),
                                ol: ({ children }) => _jsx("ol", { className: "list-decimal pl-5 mb-4 space-y-1 text-muted-foreground", children: children }),
                                li: ({ children }) => _jsx("li", { className: "pl-1", children: children }),
                                code: ({ children }) => _jsx("code", { className: "px-1.5 py-0.5 rounded bg-muted text-primary text-xs", children: children }),
                                pre: ({ children }) => _jsx("pre", { className: "p-4 rounded-xl bg-black/40 border border-border/30 overflow-x-auto text-xs mb-4", children: children }),
                                blockquote: ({ children }) => _jsx("blockquote", { className: "border-l-4 border-emerald-500/50 pl-4 italic text-muted-foreground mb-4", children: children }),
                                hr: () => _jsx("hr", { className: "my-6 border-border/30" }),
                                strong: ({ children }) => _jsx("strong", { className: "text-foreground font-semibold", children: children }),
                                a: ({ children, href }) => (_jsx("a", { href: href, className: "text-primary hover:underline", target: "_blank", rel: "noreferrer", children: children })),
                                table: ({ children }) => _jsx("table", { className: "w-full text-left border-collapse mb-4 text-xs", children: children }),
                                thead: ({ children }) => _jsx("thead", { className: "bg-muted/50 text-foreground", children: children }),
                                th: ({ children }) => _jsx("th", { className: "p-2 border border-border/30 font-semibold", children: children }),
                                td: ({ children }) => _jsx("td", { className: "p-2 border border-border/30 text-muted-foreground", children: children }),
                            }, children: guideMd }) }))] })] }));
}
