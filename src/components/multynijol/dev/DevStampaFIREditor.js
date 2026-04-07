import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";
export function DevStampaFIREditor({ firNumber, open, onClose, onPrinted }) {
    return (_jsx(Dialog, { open: open, onOpenChange: (o) => { if (!o)
            onClose(); }, children: _jsxs(DialogContent, { className: "max-w-4xl bg-card border-border/50 max-h-[90vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2 font-display tracking-wider", children: [_jsx(Printer, { className: "h-5 w-5 text-primary" }), "Stampa FIR \u2014 ", firNumber] }) }), _jsx(FIRAlternativeForm, { presetNumeroFir: firNumber, printOnly: true, onPrinted: () => {
                        onPrinted?.();
                        onClose();
                    } })] }) }));
}
