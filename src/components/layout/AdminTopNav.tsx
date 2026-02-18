import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronUp, ChevronDown, LogOut, Home, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import logoDragon from "@/assets/logo-dragon.png";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";

import iconDashboard from "@/assets/menu-icons/dashboard.png";
import iconGpsFlotta from "@/assets/menu-icons/gps_flotta.png";
import iconPersonale from "@/assets/menu-icons/personale.png";
import iconRegistroFir from "@/assets/menu-icons/registro_fir.png";
import iconRentri from "@/assets/menu-icons/rentri.png";
import iconFatturazione from "@/assets/menu-icons/fatturazione.png";
import iconReportChiamate from "@/assets/menu-icons/report_chiamate.png";
import iconZoliMessages from "@/assets/menu-icons/zoli_messages.png";
import iconAnalytics from "@/assets/menu-icons/analytics.png";
import iconAppMobile from "@/assets/menu-icons/app_mobile.png";
import iconNotifiche from "@/assets/menu-icons/notifiche.png";

interface NavItem {
  label: string;
  iconImage: string;
  href: string;
  color: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", iconImage: iconDashboard, href: "/admin", color: "251, 191, 36" },
  { label: "GPS Flotta", iconImage: iconGpsFlotta, href: "/admin/gps", color: "6, 182, 212" },
  { label: "Personale", iconImage: iconPersonale, href: "/admin/personale", color: "16, 185, 129" },
  { label: "Registro", iconImage: iconRegistroFir, href: "/admin/registro", color: "249, 115, 22" },
  { label: "Formulari", iconImage: iconRegistroFir, href: "/admin/formulari", color: "34, 197, 94" },
  { label: "Gestione FIR", iconImage: iconRegistroFir, href: "/admin/gestione-fir", color: "59, 130, 246" },
  { label: "RENTRI", iconImage: iconRentri, href: "/admin/rentri", color: "236, 72, 153" },
  { label: "Chiamate", iconImage: iconReportChiamate, href: "/admin/chiamate", color: "34, 197, 94" },
  { label: "Messaggi", iconImage: iconZoliMessages, href: "/admin/messaggi", color: "244, 114, 182" },
  { label: "AI Lemon", iconImage: zoliLemonIcon, href: "/admin/zoli-dark-lemon", color: "59, 130, 246" },
];

export function AdminTopNav() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const isRouteActive = (href: string) => {
    if (href === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(href);
  };

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
              onClick={() => navigate("/admin")}
              className="flex items-center gap-2 mr-3 group"
            >
              <img src={logoDragon} alt="Zoli Dragon" className="h-8 w-8 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-display text-white hidden lg:block">ZOLI DRAGON</span>
            </button>

            {/* Nav items */}
            <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
              {navItems.map((item) => {
                const active = isRouteActive(item.href);
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.href === "/admin"}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300",
                      active
                        ? "bg-primary/20 text-white shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                        : "text-white/70 hover:text-white hover:bg-secondary/50"
                    )}
                  >
                    <img src={item.iconImage} alt={item.label} className="h-12 w-12 transition-transform duration-300 hover:scale-125" loading="lazy" decoding="async" />
                    <span className="text-straw font-light text-xs tracking-wide">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

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
