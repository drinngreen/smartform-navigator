import { jsx as _jsx } from "react/jsx-runtime";
import { Phone, PhoneOff } from "lucide-react";
export function CallOfficeButton({ onClick, disabled = false, isActive = false, title = "Chiama sede", }) {
    return (_jsx("button", { onClick: onClick, disabled: disabled, title: title, className: "p-2.5 rounded-xl bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: isActive ? _jsx(PhoneOff, { className: "h-5 w-5" }) : _jsx(Phone, { className: "h-5 w-5" }) }));
}
