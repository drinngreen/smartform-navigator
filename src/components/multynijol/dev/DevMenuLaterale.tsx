import { useNavigate } from "react-router-dom";
import {
  Warehouse, Truck, BookOpen, UserCheck, BookUser, FileText, Receipt, Factory, Database, PenTool,
  Users, Globe, Send, PackagePlus, Euro, FileSpreadsheet, ClipboardList, ChevronDown, ChevronRight,
  PanelRightOpen, PanelRightClose,
} from "lucide-react";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";

/** Voci del menu laterale del Centro di Comando — Sviluppo. */
export const VOCI_MENU = [
    { value: "vista-veloce", label: "Vista veloce", Icon: FileText, cls: "data-[state=active]:bg-primary/20 data-[state=active]:text-primary" },
    { value: "impianto", label: "Impianto", Icon: Warehouse, cls: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" },
    { value: "carico-lavorazione", label: "Carico di lavorazione", Icon: PackagePlus, cls: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" },
    { value: "niyol", label: "Niyol", Icon: Truck, cls: "data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300" },
    { value: "conto-proprio", label: "Conto Proprio", Icon: Truck, cls: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" },
    { value: "registri", label: "Registri", Icon: BookOpen, cls: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" },
    { value: "contatti", label: "Contatti", Icon: BookUser, cls: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" },
    { value: "privati", label: "Privati", Icon: UserCheck, cls: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" },
    { value: "ricevute", label: "Ricevute", Icon: Receipt, cls: "data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400" },
    { value: "aree-riservate", label: "Aree Riservate", Icon: Factory, cls: "data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400" },
    { value: "cer-preferiti", label: "CER Preferiti", Icon: FileText, cls: "data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400" },
    { value: "gestione-fir", label: "Gestione FIR", Icon: Database, cls: "data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400" },
    { value: "firma-digitale", label: "Firma Digitale", Icon: PenTool, cls: "data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400" },
    { value: "fatturazione", label: "Fatturazione", Icon: Euro, cls: "data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300" },
    { value: "personale", label: "Personale", Icon: Users, cls: "data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400" },
    { value: "mud", label: "MUD", Icon: FileSpreadsheet, cls: "data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400" },
    { value: "ddt", label: "DDT", Icon: ClipboardList, cls: "data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400" },
    { value: "confronto-elenchi", label: "Confronto elenchi", Icon: FileSpreadsheet, cls: "data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-300" },
    { value: "backup-export", label: "Backup completo", Icon: Database, cls: "data-[state=active]:bg-primary/20 data-[state=active]:text-primary" },
];
export const SOTTO_REGISTRI = [
  { value: "intermediario", label: "Intermediario", Icon: Globe },
  { value: "generale", label: "Registro Generale", Icon: BookOpen },
  { value: "invii-rentri", label: "Invii al RENTRI", Icon: Send },
];

interface Props {
  /** Sezione attiva (nessuna se siamo fuori dal Centro di Comando, es. in Console RENTRI). */
  tab?: string;
  sub?: string;
  /** Se assenti, il clic porta al Centro di Comando con la sezione scelta aperta. */
  onTab?: (value: string) => void;
  onSub?: (value: string) => void;
}

/**
 * Menu fisso a sinistra del Centro di Comando — Sviluppo, con Dark Lemon in testa.
 * Usato anche nella Console RENTRI così l'elenco resta sempre a portata (richiesta ufficio 20/11/2026).
 */
export function DevMenuLaterale({ tab, sub, onTab, onSub }: Props) {
  const navigate = useNavigate();
  const darkLemonAperto = useZoliDarkLemonWidgetStore((st) => st.sidePanel);
  const setDarkLemonAperto = useZoliDarkLemonWidgetStore((st) => st.setSidePanel);

  const vaiTab = (value: string) => {
    if (onTab) onTab(value);
    else navigate(`/mn/admin/dev-multyproget?tab=${value}`);
  };
  const vaiSub = (value: string) => {
    if (onSub) onSub(value);
    else navigate(`/mn/admin/dev-multyproget?tab=registri&sub=${value}`);
  };

  return (
    <aside className="w-full lg:w-60 shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
      {/* Dark Lemon fisso sopra «Vista veloce»: apre/chiude il pannello a destra */}
      <button
        type="button"
        onClick={() => setDarkLemonAperto(!darkLemonAperto)}
        aria-pressed={darkLemonAperto}
        title={darkLemonAperto ? "Chiudi Dark Lemon" : "Apri Dark Lemon a destra"}
        className={`mb-2 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${darkLemonAperto ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-200" : "border-cyan-500/30 bg-card/80 text-cyan-300 hover:bg-cyan-500/10"}`}
      >
        <img src={zoliLemonIcon} alt="" className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">Dark Lemon</span>
        {darkLemonAperto ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
      </button>
      <nav className="flex h-auto w-full flex-col items-stretch gap-0.5 rounded-md bg-card/60 border border-border/30 backdrop-blur-xl p-2 text-muted-foreground">
        {VOCI_MENU.map(({ value, label, Icon, cls }) => {
          const attiva = tab === value;
          return (
            <div key={value}>
              <button
                type="button"
                data-state={attiva ? "active" : "inactive"}
                aria-current={attiva ? "page" : undefined}
                onClick={() => vaiTab(value)}
                className={`flex w-full items-center justify-start gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-all hover:text-foreground data-[state=active]:shadow-sm ${cls}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {value === "registri" && (attiva ? <ChevronDown className="h-3.5 w-3.5 opacity-70" /> : <ChevronRight className="h-3.5 w-3.5 opacity-70" />)}
              </button>
              {value === "registri" && attiva && (
                <div className="ml-5 mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-emerald-500/30 pl-2">
                  {SOTTO_REGISTRI.map((sv) => (
                    <button
                      key={sv.value}
                      type="button"
                      onClick={() => vaiSub(sv.value)}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${sub === sv.value ? "bg-emerald-500/20 text-emerald-300" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"}`}
                    >
                      <sv.Icon className="h-3.5 w-3.5" />{sv.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
