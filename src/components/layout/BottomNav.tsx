import { Link, useLocation } from "react-router-dom";
import { Home, History, MapPin, Phone, MessageCircle, Bot, User, HelpCircle, Users, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import logoDragon from "@/assets/logo-dragon.png";

const navItems = [
  { icon: Home, label: "FIR", href: "/app", color: "251, 191, 36" },
  { icon: History, label: "CRONOLOGIA", href: "/app/cronologia", color: "249, 115, 22" },
  { icon: MapPin, label: "GPS", href: "/app/gps", color: "6, 182, 212" },
  { icon: Phone, label: "TEL", href: "/app/telefono", color: "16, 185, 129" },
  { icon: MessageCircle, label: "MSG", href: "/app/comunicazioni", color: "34, 197, 94" },
  { icon: Bot, label: "AI", href: "/app/ai", color: "59, 130, 246" },
  { icon: Users, label: "SOCIAL", href: "/social", color: "139, 92, 246" },
  { icon: User, label: "PROFILO", href: "/app/profilo", color: "236, 72, 153" },
  { icon: FileText, label: "MOD.ALT", href: "/app/modulo-alternativo", color: "245, 158, 11" },
  { icon: HelpCircle, label: "GUIDA", href: "/app/guida", color: "168, 85, 247" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto safe-area-bottom">
      <div 
        className="backdrop-blur-xl border-2 border-b-0 rounded-t-2xl"
        style={{ 
          background: 'linear-gradient(180deg, rgba(20, 25, 50, 0.95) 0%, rgba(10, 15, 35, 0.98) 100%)',
          borderColor: 'rgba(251, 191, 36, 0.7)',
          boxShadow: '0 -4px 40px rgba(251, 191, 36, 0.3), 0 -2px 20px rgba(6, 182, 212, 0.2), inset 0 1px 0 rgba(251, 191, 36, 0.5), inset 0 2px 20px rgba(6, 182, 212, 0.05)',
        }}
      >
        <div className="flex items-center justify-around py-2 px-0.5">
          {navItems.map((item) => {
            const active = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all min-w-0",
                  active
                    ? "text-primary"
                    : "text-white/50 hover:text-white"
                )}
                style={active ? { color: `rgb(${item.color})` } : undefined}
              >
                <div className={cn(
                  "relative p-1 rounded-lg transition-all",
                  active && "bg-background/50"
                )}>
                  <Icon 
                    className={cn("h-5 w-5 transition-all", active && "icon-led-strong")} 
                  />
                  {active && (
                    <span 
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full animate-pulse"
                      style={{ backgroundColor: `rgb(${item.color})`, boxShadow: `0 0 6px rgb(${item.color})` }}
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[9px] font-mono font-medium tracking-wider",
                  active && "font-bold"
                )}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
