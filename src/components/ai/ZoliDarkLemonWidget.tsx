import { useState } from "react";

interface ZoliDarkLemonWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ZoliDarkLemonWidget({ isOpen, onClose }: ZoliDarkLemonWidgetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-display text-foreground">Zoli Dark Lemon AI</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <p className="text-muted-foreground">Assistente AI in fase di caricamento...</p>
      </div>
    </div>
  );
}
