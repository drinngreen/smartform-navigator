import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
export default function BulkProgress({ jobId }) {
    const [st, setSt] = useState(null);
    useEffect(() => {
        let t;
        const tick = async () => {
            try {
                const r = await fetch(`/bulk/status/${jobId}`);
                if (r.ok)
                    setSt(await r.json());
            }
            catch { }
            t = setTimeout(tick, 2000);
        };
        tick();
        return () => { if (t)
            clearTimeout(t); };
    }, [jobId]);
    if (!st || st.error)
        return _jsx("div", { children: "Avanzamento non disponibile" });
    const total = st.items.reduce((a, b) => a + b.accepted + b.duplicates, 0);
    return (_jsxs("div", { children: [_jsxs("div", { children: ["Job: ", st.id] }), _jsxs("div", { children: ["Totali accettati: ", st.totals.accepted, " | Duplicati: ", st.totals.duplicates] }), _jsx("ul", { children: st.items.map((it, idx) => (_jsxs("li", { children: [_jsx("span", { children: it.registryId }), _jsxs("span", { children: [" accettati ", it.accepted] }), _jsxs("span", { children: [" duplicati ", it.duplicates] })] }, idx))) }), _jsxs("div", { children: ["Processati: ", total] })] }));
}
