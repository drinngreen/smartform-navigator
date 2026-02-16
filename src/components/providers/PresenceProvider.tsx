import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  // Just initialize the presence hook
  useOnlineStatus();
  return <>{children}</>;
}
