import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { ContattoFormDialog } from "./ContattoFormDialog";
export function AddToRubricaPrompt({ tenantId, destinatario, tipo, onDismiss, onSaved }) {
    const [showForm, setShowForm] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm", children: [_jsx("span", { className: "text-amber-400", children: "\u26A0\uFE0F Contatto non in rubrica." }), _jsx("button", { className: "text-amber-300 underline hover:text-amber-200", onClick: () => setShowForm(true), children: "Aggiungi" }), _jsx("button", { className: "text-muted-foreground hover:text-foreground ml-auto", onClick: onDismiss, children: "Ignora" })] }), _jsx(ContattoFormDialog, { open: showForm, onOpenChange: setShowForm, tenantId: tenantId, prefill: { [tipo]: destinatario }, onSaved: onSaved })] }));
}
