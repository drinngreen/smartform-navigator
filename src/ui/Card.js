import { jsx as _jsx } from "react/jsx-runtime";
export function Card({ children, className }) {
    return _jsx("div", { className: `card ${className ?? ''}`, children: children });
}
