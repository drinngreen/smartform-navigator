import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { SocialFeed } from "@/components/social/SocialFeed";
import { Shield, Eye, Trash2, AlertTriangle, BarChart3, Users, MessageCircle } from "lucide-react";

interface ModerationLog {
  id: string;
  moderator_id: string;
  action_type: string;
  target_type: string;
  reason: string;
  created_at: string;
}

interface SocialStats {
  totalPosts: number;
  totalUsers: number;
  todayPosts: number;
  moderationActions: number;
}

export function SocialModerationSection() {
  const { user } = useAuth();
  const [view, setView] = useState<"feed" | "logs" | "stats">("stats");
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [stats, setStats] = useState<SocialStats>({ totalPosts: 0, totalUsers: 0, todayPosts: 0, moderationActions: 0 });

  const fetchStats = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];

    const [postsRes, usersRes, todayRes, modRes] = await Promise.all([
      supabase.from("social_posts").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", "167d07ad-9184-484e-85a6-da5ceafa42a3"),
      supabase.from("social_posts").select("id", { count: "exact", head: true }).gte("created_at", today),
      supabase.from("social_moderation").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      totalPosts: postsRes.count || 0,
      totalUsers: usersRes.count || 0,
      todayPosts: todayRes.count || 0,
      moderationActions: modRes.count || 0,
    });
  }, []);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("social_moderation")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs(data || []);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, [fetchStats, fetchLogs]);

  const logModeration = async (actionType: string, targetId: string, targetType: string, reason: string) => {
    if (!user) return;
    await supabase.from("social_moderation").insert({
      moderator_id: user.id,
      action_type: actionType,
      target_id: targetId,
      target_type: targetType,
      reason,
    });
  };

  const handleHidePost = async (postId: string, reason: string) => {
    await supabase.from("social_posts").update({ is_hidden: true, hidden_by: user?.id, hidden_reason: reason }).eq("id", postId);
    await logModeration("post_hidden", postId, "post", reason);
    fetchStats();
    fetchLogs();
  };

  const handleDeletePost = async (postId: string, reason: string) => {
    await logModeration("post_deleted", postId, "post", reason);
    await supabase.from("social_posts").delete().eq("id", postId);
    fetchStats();
    fetchLogs();
  };

  const handleWarnUser = async (userId: string, reason: string) => {
    await supabase
      .from("profiles")
      .update({ social_warnings: (await supabase.from("profiles").select("social_warnings").eq("user_id", userId).single()).data?.social_warnings + 1 || 1 })
      .eq("user_id", userId);
    await logModeration("user_warning", userId, "user", reason);
    fetchLogs();
  };

  const actionLabel: Record<string, string> = {
    post_hidden: "🙈 Post nascosto",
    post_deleted: "🗑️ Post eliminato",
    user_warning: "⚠️ Utente ammonito",
    comment_deleted: "💬 Commento eliminato",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="text-red-500" size={20} />
          <h2 className="font-display text-lg tracking-wider">SOCIAL MODERATION</h2>
        </div>
        <div className="flex gap-1">
          {[
            { key: "stats", icon: <BarChart3 size={14} />, label: "Stats" },
            { key: "feed", icon: <MessageCircle size={14} />, label: "Feed" },
            { key: "logs", icon: <Eye size={14} />, label: "Logs" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key as any)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                view === t.key ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {view === "stats" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Post Totali", value: stats.totalPosts, icon: <MessageCircle size={18} />, color: "text-accent" },
            { label: "Utenti Social", value: stats.totalUsers, icon: <Users size={18} />, color: "text-primary" },
            { label: "Post Oggi", value: stats.todayPosts, icon: <BarChart3 size={18} />, color: "text-green-500" },
            { label: "Azioni Moderazione", value: stats.moderationActions, icon: <Shield size={18} />, color: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <div className={`${s.color} mb-2`}>{s.icon}</div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Feed with moderation */}
      {view === "feed" && (
        <SocialFeed
          isModerator
          onHidePost={handleHidePost}
          onDeletePost={handleDeletePost}
          onWarnUser={handleWarnUser}
        />
      )}

      {/* Logs */}
      {view === "logs" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Azioni Recenti</h3>
          </div>
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {logs.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Nessuna azione di moderazione</div>
            )}
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm">{actionLabel[log.action_type] || log.action_type}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{log.reason || "—"}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString("it-IT")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
