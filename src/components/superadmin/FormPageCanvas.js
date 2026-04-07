import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useRef, useCallback, useState, useEffect } from "react";
import { FormFieldOverlay } from "./FormFieldOverlay";
export function FormPageCanvas({ pageNumber, imageSrc, fields, selectedFieldId, onSelectField, onUpdateField, onDeleteField, onAddField, }) {
    const containerRef = useRef(null);
    const [rect, setRect] = useState(null);
    useEffect(() => {
        const update = () => {
            if (containerRef.current)
                setRect(containerRef.current.getBoundingClientRect());
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    }, []);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData("field-type");
        if (!type || !containerRef.current)
            return;
        const r = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        onAddField(type, pageNumber, Math.max(0, Math.min(85, x)), Math.max(0, Math.min(95, y)));
    }, [pageNumber, onAddField]);
    const handleClick = useCallback(() => {
        onSelectField(null);
    }, [onSelectField]);
    // Update rect after image loads
    const handleImageLoad = useCallback(() => {
        if (containerRef.current)
            setRect(containerRef.current.getBoundingClientRect());
    }, []);
    return (_jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider", children: ["Pagina ", pageNumber] }), _jsxs("div", { ref: containerRef, className: "relative border-2 border-border rounded-lg overflow-hidden bg-white", onDragOver: handleDragOver, onDrop: handleDrop, onClick: handleClick, children: [_jsx("img", { src: imageSrc, alt: `Formulario pagina ${pageNumber}`, className: "w-full h-auto block select-none pointer-events-none", draggable: false, onLoad: handleImageLoad }), fields.map((f) => (_jsx(FormFieldOverlay, { field: f, selected: f.id === selectedFieldId, onSelect: () => onSelectField(f.id), onUpdate: onUpdateField, onDelete: () => onDeleteField(f.id), containerRect: rect }, f.id)))] })] }));
}
