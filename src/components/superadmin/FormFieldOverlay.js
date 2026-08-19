import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useCallback } from "react";
import { Lock, Unlock, Trash2, GripVertical } from "lucide-react";
const TYPE_COLORS = {
    date: "border-blue-500/70 bg-blue-500/15",
    time: "border-cyan-500/70 bg-cyan-500/15",
    short_text: "border-emerald-500/70 bg-emerald-500/15",
    long_text: "border-amber-500/70 bg-amber-500/15",
    checkbox: "border-purple-500/70 bg-purple-500/15",
};
export function FormFieldOverlay({ field, selected, onSelect, onUpdate, onDelete, containerRect }) {
    const [dragging, setDragging] = useState(false);
    const [resizing, setResizing] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, fx: 0, fy: 0 });
    const resizeStart = useRef({ x: 0, y: 0, fw: 0, fh: 0 });
    const handleMouseDown = useCallback((e) => {
        if (field.locked || resizing)
            return;
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        setDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY, fx: field.x, fy: field.y };
        const onMove = (ev) => {
            if (!containerRect)
                return;
            const dx = ((ev.clientX - dragStart.current.x) / containerRect.width) * 100;
            const dy = ((ev.clientY - dragStart.current.y) / containerRect.height) * 100;
            onUpdate({
                ...field,
                x: Math.max(0, Math.min(100 - field.width, dragStart.current.fx + dx)),
                y: Math.max(0, Math.min(100 - field.height, dragStart.current.fy + dy)),
            });
        };
        const onUp = () => {
            setDragging(false);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [field, containerRect, onUpdate, onSelect, resizing]);
    const handleResizeMouseDown = useCallback((e) => {
        if (field.locked)
            return;
        e.preventDefault();
        e.stopPropagation();
        setResizing(true);
        resizeStart.current = { x: e.clientX, y: e.clientY, fw: field.width, fh: field.height };
        const onMove = (ev) => {
            if (!containerRect)
                return;
            const dx = ((ev.clientX - resizeStart.current.x) / containerRect.width) * 100;
            const dy = ((ev.clientY - resizeStart.current.y) / containerRect.height) * 100;
            onUpdate({
                ...field,
                width: Math.max(3, Math.min(100 - field.x, resizeStart.current.fw + dx)),
                height: Math.max(1.5, Math.min(100 - field.y, resizeStart.current.fh + dy)),
            });
        };
        const onUp = () => {
            setResizing(false);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [field, containerRect, onUpdate]);
    const handleNameChange = (e) => {
        onUpdate({ ...field, name: e.target.value });
    };
    return (_jsxs("div", { className: `absolute border-2 rounded ${TYPE_COLORS[field.type]} ${selected ? "ring-2 ring-primary z-20" : "z-10"} ${field.locked ? "opacity-80" : ""} ${dragging ? "cursor-grabbing" : field.locked ? "cursor-default" : "cursor-grab"}`, style: {
            left: `${field.x}%`,
            top: `${field.y}%`,
            width: `${field.width}%`,
            height: `${field.height}%`,
        }, onMouseDown: handleMouseDown, onClick: (e) => { e.stopPropagation(); onSelect(); }, children: [_jsx("div", { className: "absolute inset-0 flex items-center px-1 overflow-hidden", children: selected ? (_jsx("input", { value: field.name, onChange: handleNameChange, onClick: (e) => e.stopPropagation(), onMouseDown: (e) => e.stopPropagation(), className: "w-full bg-transparent text-[10px] font-bold text-foreground outline-none border-b border-foreground/30", placeholder: "Nome campo..." })) : (_jsx("span", { className: "text-[10px] font-bold text-foreground truncate leading-tight", children: field.name || field.type })) }), selected && (_jsxs("div", { className: "absolute -top-7 left-0 flex items-center gap-1 bg-card border border-border rounded px-1 py-0.5 shadow-lg z-30", children: [_jsx("button", { onClick: (e) => { e.stopPropagation(); onUpdate({ ...field, locked: !field.locked }); }, className: "p-0.5 hover:text-primary transition-colors", title: field.locked ? "Sblocca" : "Blocca", children: field.locked ? _jsx(Lock, { size: 12 }) : _jsx(Unlock, { size: 12 }) }), _jsx("button", { onClick: (e) => { e.stopPropagation(); onDelete(); }, className: "p-0.5 hover:text-red-500 transition-colors", title: "Elimina", children: _jsx(Trash2, { size: 12 }) }), _jsx(GripVertical, { size: 12, className: "text-muted-foreground" })] })), selected && !field.locked && (_jsx("div", { className: "absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-tl cursor-se-resize z-30", onMouseDown: handleResizeMouseDown }))] }));
}
