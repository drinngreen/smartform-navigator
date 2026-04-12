import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { SocialFeed } from "@/components/social/SocialFeed";
import { Shield, Eye, BarChart3, Users, MessageCircle } from "lucide-react";
export function SocialModerationSection() {
    const { user } = useAuth();
    const [view, setView] = useState("stats");
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({ totalPosts: 0, totalUsers: 0, todayPosts: 0, moderationActions: 0 });
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
    const logModeration = async (actionType, targetId, targetType, reason) => {
        if (!user)
            return;
        await supabase.from("social_moderation").insert({
            moderator_id: user.id,
            action_type: actionType,
            target_id: targetId,
            target_type: targetType,
            reason,
        });
    };
    const handleHidePost = async (postId, reason) => {
        await supabase.from("social_posts").update({ is_hidden: true, hidden_by: user?.id, hidden_reason: reason }).eq("id", postId);
        await logModeration("post_hidden", postId, "post", reason);
        fetchStats();
        fetchLogs();
    };
    const handleDeletePost = async (postId, reason) => {
        await logModeration("post_deleted", postId, "post", reason);
        await supabase.from("social_posts").delete().eq("id", postId);
        fetchStats();
        fetchLogs();
    };
    const handleWarnUser = async (userId, reason) => {
        await supabase
            .from("profiles")
            .update({ social_warnings: (await supabase.from("profiles").select("social_warnings").eq("user_id", userId).single()).data?.social_warnings + 1 || 1 })
            .eq("user_id", userId);
        await logModeration("user_warning", userId, "user", reason);
        fetchLogs();
    };
    const actionLabel = {
        post_hidden: "🙈 Post nascosto",
        post_deleted: "🗑️ Post eliminato",
        user_warning: "⚠️ Utente ammonito",
        comment_deleted: "💬 Commento eliminato",
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Shield, { className: "text-red-500", size: 20 }), _jsx("h2", { className: "font-display text-lg tracking-wider", children: "SOCIAL MODERATION" })] }), _jsx("div", { className: "flex gap-1", children: [
                            { key: "stats", icon: _jsx(BarChart3, { size: 14 }), label: "Stats" },
                            { key: "feed", icon: _jsx(MessageCircle, { size: 14 }), label: "Feed" },
                            { key: "logs", icon: _jsx(Eye, { size: 14 }), label: "Logs" },
                        ].map((t) => (_jsxs("button", { onClick: () => setView(t.key), className: `flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-all ${view === t.key ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground"}`, children: [t.icon, " ", t.label] }, t.key))) })] }), view === "stats" && (_jsx("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3", children: [
                    { label: "Post Totali", value: stats.totalPosts, icon: _jsx(MessageCircle, { size: 18 }), color: "text-accent" },
                    { label: "Utenti Social", value: stats.totalUsers, icon: _jsx(Users, { size: 18 }), color: "text-primary" },
                    { label: "Post Oggi", value: stats.todayPosts, icon: _jsx(BarChart3, { size: 18 }), color: "text-green-500" },
                    { label: "Azioni Moderazione", value: stats.moderationActions, icon: _jsx(Shield, { size: 18 }), color: "text-red-500" },
                ].map((s) => (_jsxs("div", { className: "bg-card border border-border rounded-xl p-4", children: [_jsx("div", { className: `${s.color} mb-2`, children: s.icon }), _jsx("div", { className: "text-2xl font-bold text-foreground", children: s.value }), _jsx("div", { className: "text-xs text-muted-foreground", children: s.label })] }, s.label))) })), view === "feed" && (_jsx(SocialFeed, { isModerator: true, onHidePost: handleHidePost, onDeletePost: handleDeletePost, onWarnUser: handleWarnUser })), view === "logs" && (_jsxs("div", { className: "bg-card border border-border rounded-xl overflow-hidden", children: [_jsx("div", { className: "px-4 py-3 border-b border-border", children: _jsx("h3", { className: "text-sm font-semibold", children: "Azioni Recenti" }) }), _jsxs("div", { className: "divide-y divide-border max-h-[500px] overflow-y-auto", children: [logs.length === 0 && (_jsx("div", { className: "p-6 text-center text-sm text-muted-foreground", children: "Nessuna azione di moderazione" })), logs.map((log) => (_jsxs("div", { className: "px-4 py-3 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "text-sm", children: actionLabel[log.action_type] || log.action_type }), _jsx("p", { className: "text-xs text-muted-foreground mt-0.5", children: log.reason || "—" })] }), _jsx("span", { className: "text-xs text-muted-foreground", children: new Date(log.created_at).toLocaleString("it-IT") })] }, log.id)))] })] }))] }));
}
