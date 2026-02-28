import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./useAuth";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  // Also generate FIR draft notifications on load (client-side check)
  useEffect(() => {
    if (!user) return;
    const checkDraftFIRs = async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: drafts } = await supabase
        .from("fir_forms")
        .select("id, numero_fir, created_at")
        .eq("user_id", user.id)
        .eq("status", "bozza")
        .lt("created_at", twoHoursAgo);

      if (!drafts?.length) return;

      for (const draft of drafts) {
        // Check if notification already exists
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", user.id)
          .eq("reference_id", draft.id)
          .eq("type", "fir_draft")
          .eq("is_read", false)
          .limit(1);

        if (!existing?.length) {
          await supabase.from("notifications").insert({
            user_id: user.id,
            type: "fir_draft",
            title: "FIR in bozza",
            body: `Hai un FIR (#${draft.numero_fir || "N/A"}) ancora in bozza da più di 2 ore.`,
            reference_id: draft.id,
            reference_type: "fir_form",
          });
        }
      }
    };
    checkDraftFIRs();
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    fetchNotifications();
  }, [user, fetchNotifications]);

  const deleteNotification = useCallback(async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    fetchNotifications();
  }, [fetchNotifications]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, refresh: fetchNotifications };
}
