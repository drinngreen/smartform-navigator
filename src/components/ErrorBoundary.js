import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
export class ErrorBoundary extends React.Component {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: { hasError: false }
        });
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, message: error?.message || "Errore imprevisto" };
    }
    componentDidCatch(error, errorInfo) {
        console.error("[ErrorBoundary]", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (_jsx("div", { className: "min-h-screen bg-background text-foreground flex items-center justify-center p-6", children: _jsxs("div", { className: "max-w-xl w-full rounded-xl border border-border bg-card p-6 text-center", children: [_jsx("h1", { className: "text-xl font-semibold mb-2", children: "Si \u00E8 verificato un errore nell'app" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Ricarica la pagina. Se il problema continua, apri la console e inviami l'errore mostrato." }), this.state.message && (_jsxs("p", { className: "text-xs text-muted-foreground mt-3 break-words", children: ["Dettaglio: ", this.state.message] }))] }) }));
        }
        return this.props.children;
    }
}
