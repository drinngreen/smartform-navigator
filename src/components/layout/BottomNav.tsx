import { Link, useLocation } from "react-router-dom";
import { Home, History, MapPin, MessageCircle, Bot, User, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import logoDragon from "@/assets/logo-dragon.png";

const navItems = [
  { icon: Home, label: "FIR", href: "/app", color: "251, 191, 36" },
  { icon: History, label: "CRONOLOGIA", href: "/app/cronologia", color: "249, 115, 22" },
  { icon: MapPin, label: "GPS", href: "/app/gps", color: "6, 182, 212" },
  { icon: MessageCircle, label: "MSG", href: "/app/comunicazioni", color: "34, 197, 94" },
  { icon: Bot, label: "AI", href: "/app/ai", color: "59, 130, 246" },
  { icon: User, label: "PROFILO", href: "/app/profilo", color: "236, 72, 153" },
  { icon: HelpCircle, label: "GUIDA", href: "/app/guida", color: "168, 85, 247" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto safe-area-bottom">
      <div className="bg-card/95 backdrop-blur-xl border-t border-border/30">
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
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={active ? { color: `rgb(${item.color})` } : undefined}
              >
                <div className={cn(
                  "relative p-1 rounded-lg transition-all",
                  active && "bg-background/50"
                )}>
                  <Icon 
                    className={cn("h-5 w-5 transition-all", active && "drop-shadow-[0_0_8px_currentColor]")} 
                  />
                </div>
                <span className="text-[9px] font-mono font-medium tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
