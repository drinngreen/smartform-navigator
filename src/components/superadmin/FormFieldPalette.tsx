import React from "react";
import { Calendar, Clock, Type, AlignLeft } from "lucide-react";

export type FieldType = "date" | "time" | "short_text" | "long_text";

interface PaletteItem {
  type: FieldType;
  label: string;
  icon: React.ReactNode;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: "date", label: "Data", icon: <Calendar size={16} /> },
  { type: "time", label: "Ora", icon: <Clock size={16} /> },
  { type: "short_text", label: "Testo Breve", icon: <Type size={16} /> },
  { type: "long_text", label: "Testo Lungo", icon: <AlignLeft size={16} /> },
];

export function FormFieldPalette() {
  const handleDragStart = (e: React.DragEvent, type: FieldType) => {
    e.dataTransfer.setData("field-type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Campi Disponibili
      </h3>
      {PALETTE_ITEMS.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => handleDragStart(e, item.type)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-secondary/50 cursor-grab active:cursor-grabbing transition-all select-none"
        >
          <span className="text-primary">{item.icon}</span>
          <span className="text-sm font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
