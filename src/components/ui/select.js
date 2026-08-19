import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { createContext, useContext, useMemo, useState } from 'react';
const Ctx = createContext(null);
export function Select({ value, onValueChange, children }) {
    const [items, setItems] = useState([]);
    const ctx = useMemo(() => ({ value, onValueChange, items, addItem: (it) => setItems(prev => prev.some(p => p.value === it.value) ? prev : [...prev, it]) }), [value, onValueChange, items]);
    return _jsx(Ctx.Provider, { value: ctx, children: children });
}
export function SelectTrigger({ children, className }) {
    const ctx = useContext(Ctx);
    return (_jsxs("div", { className: `relative ${className ?? ''}`, children: [_jsx("select", { className: "w-full px-3 py-2 rounded-md bg-slate-900/60 border border-slate-800", value: ctx.value, onChange: (e) => ctx.onValueChange && ctx.onValueChange(e.target.value), children: ctx.items.map(it => _jsx("option", { value: it.value, children: it.label }, it.value)) }), children] }));
}
export function SelectValue({ placeholder }) {
    return _jsx("span", { className: "sr-only", children: placeholder });
}
export function SelectContent({ children }) {
    return _jsx(_Fragment, { children: children });
}
export function SelectItem({ value, children }) {
    const ctx = useContext(Ctx);
    const label = typeof children === 'string' ? children : children?.props?.children ?? String(children);
    React.useEffect(() => { ctx.addItem({ value, label }); }, [value, label]);
    return null;
}
