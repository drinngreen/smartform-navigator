import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Calendar, Clock, Type, AlignLeft, CheckSquare } from "lucide-react";
const PALETTE_ITEMS = [
    { type: "date", label: "Data", icon: _jsx(Calendar, { size: 16 }) },
    { type: "time", label: "Ora", icon: _jsx(Clock, { size: 16 }) },
    { type: "short_text", label: "Testo Breve", icon: _jsx(Type, { size: 16 }) },
    { type: "long_text", label: "Testo Lungo", icon: _jsx(AlignLeft, { size: 16 }) },
    { type: "checkbox", label: "Checker (X)", icon: _jsx(CheckSquare, { size: 16 }) },
];
export function FormFieldPalette() {
    const handleDragStart = (e, type) => {
        e.dataTransfer.setData("field-type", type);
        e.dataTransfer.effectAllowed = "copy";
    };
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3", children: "Campi Disponibili" }), PALETTE_ITEMS.map((item) => (_jsxs("div", { draggable: true, onDragStart: (e) => handleDragStart(e, item.type), className: "flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-secondary/50 cursor-grab active:cursor-grabbing transition-all select-none", children: [_jsx("span", { className: "text-primary", children: item.icon }), _jsx("span", { className: "text-sm font-medium", children: item.label })] }, item.type)))] }));
}
