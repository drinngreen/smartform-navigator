import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./useAuth";

export type PresenceStatus = "online" | "offline" | "busy" | "away";

interface OnlineUser {
  user_id: string;
  status: PresenceStatus;
  updated_at: string;
}

export function useOnlineStatus() {
  const { user } = useAuth();
  const [myStatus, setMyStatus] = useState<PresenceStatus>("offline");
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const updateStatus = useCallback(async (status: PresenceStatus) => {
    if (!user) return;
    try {
      const { error } = await supabase.functions.invoke("update-presence", { body: { status } });
      if (error) throw error;
      setMyStatus(status);
    } catch (error) {
      console.error("[Presence] Update error:", error);
    }
  }, [user]);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("online_status").select("*").eq("status", "online");
      if (error) throw error;
      setOnlineUsers((data as OnlineUser[]) || []);
    } catch (error) {
      console.error("[Presence] Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    updateStatus("online");
    fetchOnlineUsers();
    const heartbeat = setInterval(() => { updateStatus("online"); }, 30000);
    const handleBeforeUnload = () => {
      navigator.sendBeacon?.(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-presence`, JSON.stringify({ status: "offline" }));
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => { clearInterval(heartbeat); window.removeEventListener("beforeunload", handleBeforeUnload); updateStatus("offline"); };
  }, [user, updateStatus, fetchOnlineUsers]);

  useEffect(() => {
    const channel = supabase.channel("presence-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "online_status" }, () => { fetchOnlineUsers(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOnlineUsers]);

  return { myStatus, onlineUsers, isLoading, updateStatus, isOnline: (userId: string) => onlineUsers.some((u) => u.user_id === userId) };
}
