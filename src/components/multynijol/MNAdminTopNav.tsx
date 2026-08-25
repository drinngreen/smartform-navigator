import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { LogOut, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import logoDragon from "@/assets/logo-dragon.png";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";
import intermediazionIcon from "@/assets/intermediazione-icon.png";
import systemPromptIcon from "@/assets/system-prompt-icon.png";

import iconDashboard from "@/assets/menu-icons/dashboard.png";
import iconGpsFlotta from "@/assets/menu-icons/gps_flotta.png";
import iconPersonale from "@/assets/menu-icons/personale.png";
import iconRegistroFir from "@/assets/menu-icons/registro_fir.png";
import iconRentri from "@/assets/menu-icons/rentri.png";
import iconFatturazione from "@/assets/menu-icons/fatturazione.png";
import iconGestioneFormulari from "@/assets/menu-icons/gestione_formulari.png";
import iconReportChiamate from "@/assets/menu-icons/report_chiamate.png";
import iconZoliMessages from "@/assets/menu-icons/zoli_messages.png";
import iconAnalytics from "@/assets/menu-icons/analytics.png";
import iconNotifiche from "@/assets/menu-icons/notifiche.png";
import iconPrivati from "@/assets/menu-icons/privati.png";
import iconProduttore from "@/assets/menu-icons/produttore.png";
import iconDestinatario from "@/assets/menu-icons/destinatario.png";

interface SubNavItem {
  label: string;
  iconImage: string;
  path: string;
  color: string;
}

interface NavItem {
  label: string;
  iconImage: string;
  path: string;
  color: string;
  subItems?: SubNavItem[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", iconImage: iconDashboard, path: "", color: "251, 191, 36" },
  { label: "Dragon", iconImage: logoDragon, path: "/dragon/registro", color: "239, 68, 68", subItems: [
    { label: "Registro", iconImage: iconRegistroFir, path: "/dragon/registro", color: "249, 115, 22" },
    { label: "Articoli CER", iconImage: iconProduttore, path: "/dragon/articoli", color: "59, 130, 246" },
    { label: "Cantieri", iconImage: iconGpsFlotta, path: "/dragon/cantieri", color: "6, 182, 212" },
    { label: "Cernite", iconImage: iconGestioneFormulari, path: "/dragon/cernite/batch", color: "34, 197, 94" },
    { label: "Documenti", iconImage: iconFatturazione, path: "/dragon/documenti", color: "236, 72, 153" },
    { label: "Audit Trail", iconImage: iconAnalytics, path: "/dragon/audit", color: "168, 85, 247" },
  ] },
  { label: "Registro", iconImage: iconRegistroFir, path: "/registro", color: "249, 115, 22" },
  { label: "RENTRI", iconImage: iconRentri, path: "/rentri", color: "236, 72, 153" },
  { label: "Trasportatori", iconImage: iconPersonale, path: "/trasportatori", color: "6, 182, 212" },
  { label: "Personale", iconImage: iconPersonale, path: "/personale", color: "16, 185, 129" },
  { label: "Messaggi", iconImage: iconZoliMessages, path: "/messaggi", color: "244, 114, 182" },
  { label: "Impianto", iconImage: iconPrivati, path: "/impianto/privati", color: "20, 184, 166", subItems: [
    { label: "Privati", iconImage: iconPrivati, path: "/impianto/privati", color: "20, 184, 166" },
    { label: "Produttore", iconImage: iconProduttore, path: "/impianto/produttore", color: "249, 115, 22" },
    { label: "Destinatario", iconImage: iconDestinatario, path: "/impianto/destinatario", color: "59, 130, 246" },
  ] },
  { label: "Conferimenti", iconImage: iconRegistroFir, path: "/conferimenti", color: "249, 115, 22" },
  { label: "Pagamenti", iconImage: iconFatturazione, path: "/pagamenti", color: "239, 68, 68" },
  { label: "Formulari", iconImage: iconGestioneFormulari, path: "/formulari", color: "34, 197, 94" },
  { label: "Chiamate", iconImage: iconReportChiamate, path: "/chiamate", color: "34, 197, 94" },
  { label: "Intermediazione", iconImage: intermediazionIcon, path: "/intermediazione", color: "168, 85, 247" },
  { label: "Dark Lemon", iconImage: zoliLemonIcon, path: "/zoli-dark-lemon", color: "59, 130, 246" },
  { label: "System Prompt", iconImage: systemPromptIcon, path: "/system-prompt", color: "251, 191, 36" },
  { label: "News", iconImage: iconAnalytics, path: "/news", color: "14, 165, 233" },
  { label: "Autorizzazioni", iconImage: iconRentri, path: "/autorizzazioni", color: "217, 119, 6" },
];

const allContexts = [
  { id: "multyproget", label: "Multyproget", color: "249, 115, 22" },
  { id: "dev-multyproget", label: "🧪 Dev Multy", color: "34, 197, 94" },
  { id: "niyol", label: "Niyol", color: "6, 182, 212" },
];

// Which contexts are switchable from each context
const contextSwitchMap: Record<string, string[]> = {
  "multyproget": ["dev-multyproget"],
  "dev-multyproget": ["multyproget", "niyol"],
  "niyol": ["dev-multyproget"],
};

export function MNAdminTopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const switcherDropdownRef = useRef<HTMLDivElement>(null);

  const [subMenuOpen, setSubMenuOpen] = useState<string | null>(null);
  const [subMenuPos, setSubMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const subMenuRef = useRef<HTMLDivElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [navOverflow, setNavOverflow] = useState(false);

  const scrollNav = (dir: -1 | 1) => {
    navScrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  // Detect current context from URL
  const currentContext = location.pathname.includes("/mn/admin/dev-multyproget") ? "dev-multyproget"
    : location.pathname.includes("/mn/admin/niyol") ? "niyol"
    : location.pathname.includes("/mn/admin/multyproget") ? "multyproget"
    : null;

  const activeCtx = allContexts.find(c => c.id === currentContext);
  const availableSwitchTargets = currentContext ? (contextSwitchMap[currentContext] || []) : [];
  const switchableContexts = allContexts.filter(c => availableSwitchTargets.includes(c.id));
  const isContextPage = !!currentContext;
  const prefix = currentContext ? `/mn/admin/${currentContext}` : "/mn/admin";

  const isRouteActive = (href: string) => {
    if (href === prefix) return location.pathname === prefix;
    return location.pathname.startsWith(href);
  };

  const isSubRouteActive = (item: NavItem) => {
    if (!item.subItems) return false;
    return item.subItems.some(sub => location.pathname.startsWith(`${prefix}${sub.path}`));
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (switcherRef.current && !switcherRef.current.contains(target) && 
          switcherDropdownRef.current && !switcherDropdownRef.current.contains(target)) {
        setSwitcherOpen(false);
      }
      if (subMenuRef.current && !subMenuRef.current.contains(target)) {
        setSubMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const check = () => setNavOverflow(el.scrollWidth > el.clientWidth + 8);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [location.pathname]);

  return (
    <div className="relative px-4 pt-3">
      {/* Nav bar with animated LED border */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* LED border glow */}
        <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-r from-primary/40 via-neon-cyan/30 to-primary/40 animate-gradient-shift" />

        <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30">
          <div className="flex items-center gap-2 px-4 py-3">
            {/* Dragon logo */}
            <button
              onClick={() => navigate(currentContext ? `/mn/admin/${currentContext}` : "/mn/admin")}
              className="flex items-center gap-2 mr-3 group"
            >
              <img src={logoDragon} alt="Multy Niyol" className="h-8 w-8 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-display text-white hidden lg:block">MULTY NIYOL</span>
            </button>

            {/* Context Switcher */}
            {isContextPage && (
              <div className="relative mr-2" ref={switcherRef}>
                <button
                  onClick={() => setSwitcherOpen(!switcherOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all bg-primary/20 text-primary hover:bg-primary/30"
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: `rgba(${activeCtx?.color}, 0.8)` }} />
                  {activeCtx?.label}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {switcherOpen && createPortal(
                  <div
                    ref={switcherDropdownRef}
                    className="fixed z-[9999] bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden min-w-[160px]"
                    style={{
                      left: switcherRef.current?.getBoundingClientRect().left ?? 0,
                      top: (switcherRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                    }}
                  >
                    {switchableContexts.map((ctx) => (
                      <button
                        key={ctx.id}
                        onClick={() => {
                          setSwitcherOpen(false);
                          navigate(`/mn/admin/${ctx.id}`);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors",
                          ctx.id === currentContext ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        )}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: `rgba(${ctx.color}, 0.8)` }} />
                        {ctx.label}
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
              </div>
            )}

            {/* Nav items with PNG icons */}
            {navOverflow && (
              <button
                type="button"
                onClick={() => scrollNav(-1)}
                aria-label="Scorri menu a sinistra"
                className="shrink-0 p-1 rounded-lg bg-secondary/60 text-white/80 hover:text-white hover:bg-secondary"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div
              ref={navScrollRef}
              onWheel={(e) => {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && navScrollRef.current) {
                  navScrollRef.current.scrollLeft += e.deltaY;
                }
              }}
              className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide scroll-smooth"
            >
              {isContextPage && navItems.map((item) => {
                const href = item.path ? `${prefix}${item.path}` : prefix;
                const active = item.subItems ? isSubRouteActive(item) : isRouteActive(href);

                if (item.subItems) {
                  return (
                    <div key={item.label} className="relative">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (subMenuOpen === item.label) {
                            setSubMenuOpen(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setSubMenuPos({ x: rect.left, y: rect.bottom + 4 });
                            setSubMenuOpen(item.label);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300",
                          active
                            ? "bg-primary/20 text-white shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                            : "text-white/70 hover:text-white hover:bg-secondary/50"
                        )}
                      >
                        <img src={item.iconImage} alt={item.label} className="h-9 w-9 transition-transform duration-300 hover:scale-125" />
                        <span className="text-straw font-light text-xs tracking-wide">{item.label}</span>
                        <ChevronDown className="h-3 w-3 text-straw/60" />
                      </button>
                      {subMenuOpen === item.label && createPortal(
                        <div
                          ref={subMenuRef}
                          className="fixed z-[9999] bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden min-w-[220px]"
                          style={{ left: subMenuPos.x, top: subMenuPos.y }}
                        >
                          {item.subItems.map((sub) => (
                            <button
                              key={sub.path}
                              onClick={() => {
                                navigate(`${prefix}${sub.path}`);
                                setSubMenuOpen(null);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                                location.pathname.startsWith(`${prefix}${sub.path}`)
                                  ? "bg-primary/20 text-white"
                                  : "text-white/70 hover:text-white hover:bg-secondary/50"
                              )}
                            >
                              <img src={sub.iconImage} alt={sub.label} className="h-8 w-8" />
                              <span>{sub.label}</span>
                            </button>
                          ))}
                        </div>,
                        document.body
                      )}
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={href}
                    to={href}
                    end={!item.path}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300",
                      active
                        ? "bg-primary/20 text-white shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                        : "text-white/70 hover:text-white hover:bg-secondary/50"
                    )}
                  >
                    <img src={item.iconImage} alt={item.label} className="h-9 w-9 transition-transform duration-300 hover:scale-125" />
                    <span className="text-straw font-light text-xs tracking-wide">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            {navOverflow && (
              <button
                type="button"
                onClick={() => scrollNav(1)}
                aria-label="Scorri menu a destra"
                className="shrink-0 p-1 rounded-lg bg-secondary/60 text-white/80 hover:text-white hover:bg-secondary animate-pulse"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {/* Profile & Logout */}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs text-white/80 font-mono hidden md:block">
                {profile?.nome} {profile?.cognome}
              </span>
              <button
                onClick={signOut}
                className="p-1.5 rounded-lg text-white/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
