import { useState, useRef } from "react";
import { Printer, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import pag1 from "@/assets/formulario_pag_1.png";
import pag2 from "@/assets/formulario_pag_2.png";
import pag3 from "@/assets/formulario_pag_3.png";

const PAGE_IMAGES = [pag1, pag2, pag3];

interface Props {
  firNumber: string;
  open: boolean;
  onClose: () => void;
}

const FIELD_GROUPS = [
  { label: "Numero FIR", key: "numero_fir", page: 0, x: 60, y: 3, w: 35 },
  { label: "Produttore - Denominazione", key: "prod_denom", page: 0, x: 5, y: 12, w: 55 },
  { label: "Produttore - Codice Fiscale", key: "prod_cf", page: 0, x: 60, y: 12, w: 35 },
  { label: "Produttore - Indirizzo", key: "prod_ind", page: 0, x: 5, y: 18, w: 90 },
  { label: "Destinatario - Denominazione", key: "dest_denom", page: 0, x: 5, y: 30, w: 55 },
  { label: "Destinatario - Codice Fiscale", key: "dest_cf", page: 0, x: 60, y: 30, w: 35 },
  { label: "Trasportatore - Denominazione", key: "tras_denom", page: 0, x: 5, y: 45, w: 55 },
  { label: "Trasportatore - Codice Fiscale", key: "tras_cf", page: 0, x: 60, y: 45, w: 35 },
  { label: "CER", key: "cer", page: 0, x: 5, y: 60, w: 20 },
  { label: "Descrizione Rifiuto", key: "desc_rif", page: 0, x: 28, y: 60, w: 65 },
  { label: "Quantità (kg)", key: "quantita", page: 0, x: 5, y: 70, w: 20 },
  { label: "Targa Automezzo", key: "targa", page: 0, x: 5, y: 80, w: 25 },
  { label: "Conducente", key: "conducente", page: 0, x: 35, y: 80, w: 35 },
  { label: "Data/Ora Inizio Trasporto", key: "data_inizio", page: 0, x: 5, y: 88, w: 30 },
];

export function DevStampaFIREditor({ firNumber, open, onClose }: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const [fields, setFields] = useState<Record<string, string>>(() => ({
    numero_fir: firNumber,
  }));
  const printRef = useRef<HTMLDivElement>(null);

  const updateField = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    
    w.document.write(`
      <html>
      <head>
        <title>FIR ${firNumber}</title>
        <style>
          @media print { @page { margin: 5mm; size: A4; } }
          body { margin: 0; padding: 0; font-family: 'Courier New', monospace; }
          .page { position: relative; width: 210mm; min-height: 297mm; page-break-after: always; }
          .page img { width: 100%; height: auto; display: block; }
          .field { position: absolute; font-size: 9px; font-weight: bold; color: #000; white-space: nowrap; overflow: hidden; }
        </style>
      </head>
      <body>
        ${PAGE_IMAGES.map((img, pi) => `
          <div class="page">
            <img src="${img}" />
            ${FIELD_GROUPS.filter(f => f.page === pi).map(f => 
              `<div class="field" style="left:${f.x}%;top:${f.y}%;width:${f.w}%">${fields[f.key] || ""}</div>`
            ).join("")}
          </div>
        `).join("")}
      </body>
      </html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl bg-card border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display tracking-wider">
            <Printer className="h-5 w-5 text-primary" />
            Stampa FIR — {firNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Page tabs */}
          <div className="flex gap-2">
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p - 1)}
                className={`px-4 py-2 rounded-lg text-sm font-display tracking-wider transition-colors ${
                  currentPage === p - 1 ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary/50 text-muted-foreground border border-border/20"
                }`}
              >
                Pagina {p}
              </button>
            ))}
          </div>

          {/* Fields for current page */}
          <div className="grid grid-cols-2 gap-3">
            {FIELD_GROUPS.filter(f => f.page === currentPage).map((f) => (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground">{f.label}</label>
                <input
                  value={fields[f.key] || ""}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-background/80 border border-border/30 text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="relative border border-border/30 rounded-xl overflow-hidden bg-white" ref={printRef}>
            <img src={PAGE_IMAGES[currentPage]} alt={`Pagina ${currentPage + 1}`} className="w-full h-auto" />
            {FIELD_GROUPS.filter(f => f.page === currentPage).map((f) => (
              <div key={f.key} className="absolute text-[9px] font-bold text-black font-mono whitespace-nowrap overflow-hidden" style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%` }}>
                {fields[f.key] || ""}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-6 py-2 rounded-xl border border-border/50 text-muted-foreground hover:text-foreground transition-colors">
              Chiudi
            </button>
            <button onClick={handlePrint} className="px-6 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary font-display tracking-wider hover:bg-primary/30 transition-colors flex items-center gap-2">
              <Printer className="h-4 w-4" /> STAMPA
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
