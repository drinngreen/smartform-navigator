import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from "react";
const SUPABASE_URL = "https://zungtspcixpxjpjlcwzy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bmd0c3BjaXhweGpwamxjd3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Nzk0NDQsImV4cCI6MjA4NDM1NTQ0NH0.eNLT478rWBxK-G9sOhiHaWC3j-u_KzPWu07wEC4BQxA";
const EXCLUDED = ["node_modules", ".git", "dist", ".next", ".cache", "build", ".DS_Store", "Thumbs.db"];
function shouldExclude(path) {
    return EXCLUDED.some(ex => path.includes(`/${ex}/`) || path.startsWith(`${ex}/`) || path.endsWith(`/${ex}`) || path === ex);
}
async function uploadFile(storagePath, file) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/code-backup/${encodeURIComponent(storagePath)}`, {
        method: "POST",
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "x-upsert": "true",
        },
        body: file,
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`${storagePath}: ${err}`);
    }
}
export default function Restore() {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });
    const [log, setLog] = useState([]);
    const inputRef = useRef(null);
    const handleSelect = (e) => {
        const selected = Array.from(e.target.files || []);
        const filtered = selected.filter(f => {
            const path = f.webkitRelativePath || f.name;
            return !shouldExclude(path);
        });
        setFiles(filtered);
        setLog([`Selezionati ${filtered.length} file (esclusi ${selected.length - filtered.length} non necessari)`]);
    };
    const handleUpload = async () => {
        if (files.length === 0)
            return;
        setUploading(true);
        setProgress({ done: 0, total: files.length, errors: 0 });
        setLog(prev => [...prev, `Inizio upload di ${files.length} file...`]);
        let done = 0;
        let errors = 0;
        for (let i = 0; i < files.length; i += 3) {
            const batch = files.slice(i, i + 3);
            const results = await Promise.allSettled(batch.map(async (file) => {
                const path = file.webkitRelativePath || file.name;
                const parts = path.split("/");
                const storagePath = parts.length > 1 ? parts.slice(1).join("/") : path;
                await uploadFile(storagePath, file);
                return storagePath;
            }));
            for (const r of results) {
                if (r.status === "fulfilled") {
                    done++;
                }
                else {
                    errors++;
                    setLog(prev => [...prev, `❌ ${r.reason?.message || "Errore"}`]);
                }
            }
            setProgress({ done, total: files.length, errors });
        }
        setLog(prev => [...prev, `✅ Upload completato: ${done} ok, ${errors} errori`]);
        setUploading(false);
    };
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (_jsx("div", { className: "min-h-screen bg-slate-950 text-slate-100 p-8", children: _jsxs("div", { className: "max-w-2xl mx-auto space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold text-amber-400", children: "\uD83D\uDD04 Ripristino Progetto" }), _jsx("p", { className: "text-slate-400 text-sm", children: "Seleziona la cartella del progetto recuperato. I file verranno caricati nello storage per il ripristino. Vengono esclusi automaticamente: node_modules, .git, dist, build, .cache" }), _jsxs("div", { className: "border-2 border-dashed border-slate-700 rounded-lg p-8 text-center", children: [_jsx("input", { ref: inputRef, type: "file", 
                            // @ts-ignore
                            webkitdirectory: "", multiple: true, onChange: handleSelect, className: "hidden" }), _jsx("button", { onClick: () => inputRef.current?.click(), className: "px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition", children: "\uD83D\uDCC1 Seleziona cartella progetto" }), files.length > 0 && (_jsxs("p", { className: "mt-3 text-slate-300 text-sm", children: [files.length, " file pronti per l'upload"] }))] }), files.length > 0 && (_jsx("button", { onClick: handleUpload, disabled: uploading, className: "w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:brightness-110 disabled:opacity-50 rounded-lg font-medium transition", children: uploading ? `Caricamento... ${pct}%` : "🚀 Carica tutto" })), progress.total > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "w-full bg-slate-800 rounded-full h-3", children: _jsx("div", { className: "bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300", style: { width: `${pct}%` } }) }), _jsxs("div", { className: "flex justify-between text-xs text-slate-400", children: [_jsxs("span", { children: [progress.done, "/", progress.total, " file"] }), progress.errors > 0 && _jsxs("span", { className: "text-red-400", children: [progress.errors, " errori"] })] })] })), log.length > 0 && (_jsx("div", { className: "bg-slate-900 border border-slate-800 rounded-lg p-4 max-h-60 overflow-y-auto", children: log.map((l, i) => (_jsx("div", { className: "text-xs text-slate-300 font-mono py-0.5", children: l }, i))) }))] }) }));
}
