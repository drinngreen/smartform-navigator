import { useMemo, useState } from "react";
import { Search, Phone, MessageSquare, Bell, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import zoliLemonIcon from "@/assets/zoli-dark-lemon-icon.png";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isWidgetOpen = useZoliDarkLemonWidgetStore((s) => s.isOpen);
  const toggleWidget = useZoliDarkLemonWidgetStore((s) => s.toggle);

  const widgetButtonClassName = useMemo(() => {
    return `p-2 rounded-lg border transition-all duration-300 ${
      isWidgetOpen
        ? "bg-blue-500/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        : "bg-secondary/50 border-border hover:bg-secondary hover:border-blue-500/30"
    }`;
  }, [isWidgetOpen]);

  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-display text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] tracking-wide">{title}</h1>
        {subtitle && (
          <p className="text-sm text-white/90 font-mono mt-1 drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* AI Widget toggle */}
        <button onClick={toggleWidget} className={widgetButtonClassName} title="Zoli Dark Lemon AI">
          <img src={zoliLemonIcon} alt="AI" className="h-5 w-5" />
        </button>

        {/* Messages */}
        <button
          onClick={() => navigate("/admin/messaggi")}
          className="p-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors"
          title="Messaggi"
        >
          <MessageSquare className="h-5 w-5 text-white/80" />
        </button>

        {/* Notifications */}
        <button
          className="p-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors"
          title="Notifiche"
        >
          <Bell className="h-5 w-5 text-white/80" />
        </button>
      </div>
    </div>
  );
}
