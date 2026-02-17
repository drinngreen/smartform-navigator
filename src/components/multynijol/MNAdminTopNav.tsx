import { NavLink, useNavigate, useLocation, useParams } from "react-router-dom";
import { LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import logoDragon from "@/assets/logo-dragon.png";
import { useState, useRef, useEffect } from "react";

const navItems = [
  { label: "Dashboard", path: "" },
  { label: "Registro", path: "/registro" },
  { label: "RENTRI", path: "/rentri" },
  { label: "Trasportatori", path: "/trasportatori" },
  { label: "Personale", path: "/personale" },
  { label: "Messaggi", path: "/messaggi" },
  { label: "Magazzino", path: "/magazzino" },
  { label: "Conferimenti", path: "/conferimenti" },
  { label: "Impianti", path: "/impianti" },
  { label: "Pagamenti", path: "/pagamenti" },
  { label: "Formulari", path: "/formulari" },
];

const contexts = [
  { id: "multyproget", label: "Multyproget", color: "249, 115, 22" },
  { id: "niyol", label: "Niyol", color: "6, 182, 212" },
];

export function MNAdminTopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Detect current context from URL
  const currentContext = location.pathname.includes("/mn/admin/niyol") ? "niyol"
    : location.pathname.includes("/mn/admin/multyproget") ? "multyproget"
    : null;

  const activeCtx = contexts.find(c => c.id === currentContext);
  const isContextPage = !!currentContext;
  const prefix = currentContext ? `/mn/admin/${currentContext}` : "/mn/admin";

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="px-4 pt-3">
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-r from-primary/40 via-neon-cyan/30 to-primary/40 animate-gradient-shift" />
        <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30">
          <div className="flex items-center gap-1 px-3 py-2">
            <button onClick={() => navigate("/mn/admin")} className="flex items-center gap-2 mr-2 group">
              <img src={logoDragon} alt="Multy Niyol" className="h-8 w-8 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-display text-primary hidden lg:block">MULTY NIYOL</span>
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
                {switcherOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-card border border-border/50 rounded-xl shadow-lg z-50 overflow-hidden min-w-[160px]">
                    {contexts.map((ctx) => (
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
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
              {isContextPage && navItems.map((item) => {
                const href = item.path ? `${prefix}${item.path}` : prefix;
                return (
                  <NavLink
                    key={href}
                    to={href}
                    end={!item.path}
                    className={({ isActive }) => cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-300",
                      isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </div>

            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs text-muted-foreground font-mono hidden md:block">
                {profile?.nome} {profile?.cognome}
              </span>
              <button onClick={signOut} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
