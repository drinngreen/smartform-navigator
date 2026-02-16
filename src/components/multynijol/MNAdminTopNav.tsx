import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import logoDragon from "@/assets/logo-dragon.png";

const navItems = [
  { label: "Dashboard", href: "/mn/admin" },
  { label: "Registro", href: "/mn/admin/registro" },
  { label: "RENTRI", href: "/mn/admin/rentri" },
  { label: "Trasportatori", href: "/mn/admin/trasportatori" },
  { label: "Personale", href: "/mn/admin/personale" },
  { label: "Messaggi", href: "/mn/admin/messaggi" },
  { label: "Magazzino", href: "/mn/admin/magazzino" },
  { label: "Conferimenti", href: "/mn/admin/conferimenti" },
  { label: "Impianti", href: "/mn/admin/impianti" },
  { label: "Pagamenti", href: "/mn/admin/pagamenti" },
  { label: "Formulari", href: "/mn/admin/formulari" },
];

export function MNAdminTopNav() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  return (
    <div className="px-4 pt-3">
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-r from-primary/40 via-neon-cyan/30 to-primary/40 animate-gradient-shift" />
        <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30">
          <div className="flex items-center gap-1 px-3 py-2">
            <button onClick={() => navigate("/mn/admin")} className="flex items-center gap-2 mr-3 group">
              <img src={logoDragon} alt="Multy Niyol" className="h-8 w-8 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-display text-primary hidden lg:block">MULTY NIYOL</span>
            </button>
            <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === "/mn/admin"}
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-300",
                    isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {item.label}
                </NavLink>
              ))}
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
