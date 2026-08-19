import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Trophy, TrendingUp, MessageCircle, Heart } from "lucide-react";
// Demo data — replace with real query later
const DEMO_LEADERBOARD = [
    { rank: 1, name: "Marco Rossi", initial: "M", points: 342, posts: 28, likes: 156 },
    { rank: 2, name: "Luigi Bianchi", initial: "L", points: 289, posts: 22, likes: 134 },
    { rank: 3, name: "Andrea Verdi", initial: "A", points: 245, posts: 19, likes: 98 },
    { rank: 4, name: "Giuseppe Neri", initial: "G", points: 198, posts: 15, likes: 87 },
    { rank: 5, name: "Paolo Ferrari", initial: "P", points: 176, posts: 14, likes: 72 },
    { rank: 6, name: "Roberto Conti", initial: "R", points: 154, posts: 11, likes: 65 },
    { rank: 7, name: "Davide Romano", initial: "D", points: 132, posts: 10, likes: 54 },
    { rank: 8, name: "Stefano Marino", initial: "S", points: 98, posts: 7, likes: 41 },
];
const medalColors = ["from-yellow-400 to-amber-600", "from-slate-300 to-slate-500", "from-amber-600 to-orange-800"];
export function SocialLeaderboard() {
    return (_jsxs("div", { className: "space-y-3 p-4", children: [_jsxs("div", { className: "text-center py-4", children: [_jsx(Trophy, { size: 36, className: "mx-auto text-primary mb-2" }), _jsx("h2", { className: "text-lg font-bold text-foreground", children: "Classifica Settimanale" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "I trasportatori pi\u00F9 attivi della community" })] }), _jsx("div", { className: "flex items-end justify-center gap-3 pb-4", children: [1, 0, 2].map((idx) => {
                    const entry = DEMO_LEADERBOARD[idx];
                    const isFirst = idx === 0;
                    return (_jsxs("div", { className: `flex flex-col items-center ${isFirst ? "order-2" : idx === 1 ? "order-1" : "order-3"}`, children: [_jsx("div", { className: `w-${isFirst ? 16 : 12} h-${isFirst ? 16 : 12} rounded-full bg-gradient-to-br ${medalColors[idx]} flex items-center justify-center text-${isFirst ? "xl" : "base"} font-bold text-primary-foreground shadow-lg mb-1.5`, style: { width: isFirst ? 64 : 48, height: isFirst ? 64 : 48, fontSize: isFirst ? 20 : 16 }, children: entry.initial }), _jsxs("span", { className: "text-[10px] font-bold text-primary", children: ["#", entry.rank] }), _jsx("span", { className: "text-xs font-semibold text-foreground text-center leading-tight mt-0.5", children: entry.name.split(" ")[0] }), _jsxs("span", { className: "text-[10px] text-muted-foreground", children: [entry.points, " pts"] })] }, entry.rank));
                }) }), _jsx("div", { className: "space-y-1.5", children: DEMO_LEADERBOARD.slice(3).map((entry) => (_jsxs("div", { className: "flex items-center gap-3 bg-card border border-border/50 rounded-xl px-4 py-3", children: [_jsx("span", { className: "text-sm font-bold text-muted-foreground w-6 text-center", children: entry.rank }), _jsx("div", { className: "w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-foreground", children: entry.initial }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("span", { className: "text-sm font-semibold text-foreground block", children: entry.name }), _jsxs("div", { className: "flex items-center gap-3 text-[10px] text-muted-foreground", children: [_jsxs("span", { className: "flex items-center gap-0.5", children: [_jsx(MessageCircle, { size: 10 }), " ", entry.posts] }), _jsxs("span", { className: "flex items-center gap-0.5", children: [_jsx(Heart, { size: 10 }), " ", entry.likes] })] })] }), _jsxs("div", { className: "flex items-center gap-1 text-sm font-bold text-primary", children: [_jsx(TrendingUp, { size: 14 }), " ", entry.points] })] }, entry.rank))) })] }));
}
