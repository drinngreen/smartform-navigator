import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Package, FileText, Scissors, History, ExternalLink,
  Warehouse, ArrowDownToLine, ArrowUpFromLine, Repeat2, Search,
  ClipboardCheck, FileBarChart, Truck, Factory, Blend
} from "lucide-react";

const PREFIX = "/mn/admin/dev-multyproget/dragon";

const phases = [
  {
    title: "Fase 1 — Carico (Ingresso Materiali)",
    subtitle: "Rifiuti da terzi con FIR, produzione interna, ingresso MPS/DDT",
    color: "emerald",
    items: [
      { label: "Registro — Ingresso Rifiuti", desc: "Carico da FIR (terzi), peso a destino → Ufficiale", icon: ArrowDownToLine, path: `${PREFIX}/registro`, color: "emerald" },
      { label: "Registro — Carico Produzione", desc: "Rifiuto prodotto internamente (CER, data, Kg)", icon: Factory, path: `${PREFIX}/registro`, color: "emerald" },
      { label: "Magazzino — Carico MPS/Materiali", desc: "Movimento manuale o da DDT di ingresso", icon: Package, path: `${PREFIX}/magazzino`, color: "emerald" },
    ],
  },
  {
    title: "Fase 2 — Lavorazioni (Trasformazione)",
    subtitle: "Scarico lavorazione FIFO, ricarico automatico, cernite e miscelazioni",
    color: "amber",
    items: [
      { label: "Scarico di Lavorazione", desc: "Quantità da individuare → FIFO automatico (segno −)", icon: Scissors, path: `${PREFIX}/cernite/modelli`, color: "amber" },
      { label: "Ricarico da Lavorazione", desc: "Proposta automatica → nuovi CER su registro, MPS su magazzino (segno +)", icon: Repeat2, path: `${PREFIX}/cernite/modelli`, color: "amber" },
      { label: "Miscelazioni", desc: "N input CER → 1 output cumulativo CER/MPS", icon: Blend, path: `${PREFIX}/cernite/modelli`, color: "amber" },
    ],
  },
  {
    title: "Fase 3 — Scarico (Uscita Materiali)",
    subtitle: "Uscita rifiuti con FIR, uscita MPS/DDT, carico & scarico contestuale",
    color: "red",
    items: [
      { label: "Registro — Scarico Uscita + FIR", desc: "Seleziona CER con giacenza → abbina carichi → FIR automatico", icon: ArrowUpFromLine, path: `${PREFIX}/registro`, color: "red" },
      { label: "Magazzino — Scarico MPS/Materiali", desc: "Movimento manuale o da DDT di uscita", icon: Truck, path: `${PREFIX}/magazzino`, color: "red" },
      { label: "Carico & Scarico Contestuale", desc: "Per CER senza giacenza: produzione e uscita simultanea", icon: Repeat2, path: `${PREFIX}/registro`, color: "red" },
    ],
  },
  {
    title: "Fase 4 — Controllo e Tracciabilità",
    subtitle: "Traccia lavorazioni, rintraccia/traccia, stampa situazione magazzino",
    color: "blue",
    items: [
      { label: "Traccia Lavorazioni", desc: "Sequenza scarichi (−) e ricarichi (+), raggruppamento per CER", icon: ClipboardCheck, path: `${PREFIX}/registro`, color: "blue" },
      { label: "Rintraccia & Traccia", desc: "Ciclo di vita completo: FIR ingresso → lavorazione → magazzino", icon: Search, path: `${PREFIX}/magazzino`, color: "blue" },
      { label: "Stampa Situazione Magazzino", desc: "Report PDF giacenze effettive, giornale di magazzino", icon: FileBarChart, path: `${PREFIX}/magazzino`, color: "blue" },
    ],
  },
];

const quickLinks = [
  { label: "Registro", icon: BookOpen, path: `${PREFIX}/registro` },
  { label: "Magazzino", icon: Package, path: `${PREFIX}/magazzino` },
  { label: "Archivio Magazzini", icon: Warehouse, path: `${PREFIX}/magazzini` },
  { label: "Articoli CER/MPS", icon: FileText, path: `${PREFIX}/articoli` },
  { label: "Cernite & Modelli", icon: Scissors, path: `${PREFIX}/cernite/modelli` },
  { label: "Audit Trail", icon: History, path: `${PREFIX}/audit` },
];

const colorMap = {
  emerald: { border: "border-emerald-500/30", bg: "hover:bg-emerald-500/10", text: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300" },
  amber: { border: "border-amber-500/30", bg: "hover:bg-amber-500/10", text: "text-amber-400", badge: "bg-amber-500/20 text-amber-300" },
  red: { border: "border-red-500/30", bg: "hover:bg-red-500/10", text: "text-red-400", badge: "bg-red-500/20 text-red-300" },
  blue: { border: "border-blue-500/30", bg: "hover:bg-blue-500/10", text: "text-blue-400", badge: "bg-blue-500/20 text-blue-300" },
};

export function DevMagazzinoDevModule() {
  const navigate = useNavigate();

  return _jsxs("div", { className: "space-y-6", children: [
    _jsxs("div", { children: [
      _jsx("h3", { className: "text-lg font-semibold text-emerald-300", children: "🐉 Dragon — Magazzino Dev" }),
      _jsx("p", { className: "text-xs text-muted-foreground", children: "Sistema integrato Registro & Magazzino Rifiuti — Flusso operativo completo" }),
    ] }),

    _jsx("div", { className: "grid grid-cols-3 sm:grid-cols-6 gap-2", children:
      quickLinks.map((s) => _jsxs(Button, {
        variant: "outline", size: "sm",
        className: "flex items-center gap-1.5 h-auto py-2 border-border/40 hover:border-emerald-500/40 hover:bg-emerald-500/10 text-xs",
        onClick: () => navigate(s.path),
        children: [_jsx(s.icon, { className: "h-3.5 w-3.5 text-emerald-400" }), s.label],
      }, s.label)),
    }),

    ...phases.map((phase) => {
      const c = colorMap[phase.color];
      return _jsxs("div", { className: "space-y-2", children: [
        _jsx("div", { className: "flex items-center gap-2", children:
          _jsx("span", { className: `text-xs font-bold px-2 py-0.5 rounded ${c.badge}`, children: phase.title }),
        }),
        _jsx("p", { className: "text-xs text-muted-foreground ml-1", children: phase.subtitle }),
        _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3", children:
          phase.items.map((item) => {
            const ic = colorMap[item.color];
            return _jsxs("button", {
              className: `text-left rounded-lg border ${ic.border} ${ic.bg} bg-card p-4 transition-all space-y-1`,
              onClick: () => navigate(item.path),
              children: [
                _jsxs("div", { className: "flex items-center gap-2", children: [
                  _jsx(item.icon, { className: `h-5 w-5 ${ic.text}` }),
                  _jsx("span", { className: "text-sm font-medium text-foreground", children: item.label }),
                ] }),
                _jsx("p", { className: "text-xs text-muted-foreground", children: item.desc }),
              ],
            }, item.label);
          }),
        }),
      ] }, phase.title);
    }),
  ] });
}
