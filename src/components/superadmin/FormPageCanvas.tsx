import React, { useRef, useCallback, useState, useEffect } from "react";
import { FormFieldOverlay, type FormField } from "./FormFieldOverlay";
import type { FieldType } from "./FormFieldPalette";

interface Props {
  pageNumber: number;
  imageSrc: string;
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onUpdateField: (f: FormField) => void;
  onDeleteField: (id: string) => void;
  onAddField: (type: FieldType, page: number, x: number, y: number) => void;
}

export function FormPageCanvas({
  pageNumber, imageSrc, fields, selectedFieldId, onSelectField, onUpdateField, onDeleteField, onAddField,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setRect(containerRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("field-type") as FieldType;
    if (!type || !containerRef.current) return;
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
    if (containerRef.current) setRect(containerRef.current.getBoundingClientRect());
  }, []);

  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
        Pagina {pageNumber}
      </div>
      <div
        ref={containerRef}
        className="relative border-2 border-border rounded-lg overflow-hidden bg-white"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <img
          src={imageSrc}
          alt={`Formulario pagina ${pageNumber}`}
          className="w-full h-auto block select-none pointer-events-none"
          draggable={false}
          onLoad={handleImageLoad}
        />
        {fields.map((f) => (
          <FormFieldOverlay
            key={f.id}
            field={f}
            selected={f.id === selectedFieldId}
            onSelect={() => onSelectField(f.id)}
            onUpdate={onUpdateField}
            onDelete={() => onDeleteField(f.id)}
            containerRect={rect}
          />
        ))}
      </div>
    </div>
  );
}
