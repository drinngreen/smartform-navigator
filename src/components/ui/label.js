import { jsx as _jsx } from "react/jsx-runtime";
export function Label({ children, htmlFor, className }) {
    return _jsx("label", { htmlFor: htmlFor, className: `text-sm text-slate-300 ${className ?? ''}`, children: children });
}
