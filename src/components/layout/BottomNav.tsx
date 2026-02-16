import { Link, useLocation } from "react-router-dom";
import { Home, History, MapPin, MessageCircle, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "FIR", href: "/app", color: "251, 191, 36" },
  { icon: History, label: "Cronologia", href: "/app/cronologia", color: "249, 115, 22" },
  { icon: MapPin, label: "GPS", href: "/app/gps", color: "6, 182, 212" },
  { icon: MessageCircle, label: "Msg", href: "/app/comunicazioni", color: "34, 197, 94" },
  { icon: Bot, label: "AI", href: "/app/ai", color: "59, 130, 246" },
  { icon: User, label: "Profilo", href: "/app/profilo", color: "236, 72, 153" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto">
      <div className="bg-card/90 backdrop-blur-xl border-t border-border/30">
        <div className="flex items-center justify-around py-2 px-1">
          {navItems.map((item) => {
            const active = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
