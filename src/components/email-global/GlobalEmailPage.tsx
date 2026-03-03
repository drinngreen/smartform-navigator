// Pagina email completa Global Reco con tabs Inbox/Inviate/Componi
import { useState } from "react";
import { useIsGlobalReco } from "@/hooks/useGlobalEmail";
import { GlobalEmailInbox } from "./GlobalEmailInbox";
import { GlobalEmailOutbox } from "./GlobalEmailOutbox";
import { GlobalEmailCompose } from "./GlobalEmailCompose";
import { Mail, Send, Inbox } from "lucide-react";

const tabs = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "outbox", label: "Inviate", icon: Send },
  { id: "compose", label: "Componi", icon: Mail },
] as const;

type Tab = typeof tabs[number]["id"];

export function GlobalEmailPage() {
  const isGR = useIsGlobalReco();
  const [activeTab, setActiveTab] = useState<Tab>("inbox");

  if (!isGR) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Le funzionalità email sono disponibili solo per il tenant Global Reco.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border/30 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/15 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "inbox" && <GlobalEmailInbox />}
      {activeTab === "outbox" && <GlobalEmailOutbox />}
      {activeTab === "compose" && <GlobalEmailCompose />}
    </div>
  );
}
