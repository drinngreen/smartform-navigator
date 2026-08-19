import { useEffect, useRef, useState } from "react";
import { elencoFormulariRentri, rentriConfigKey, RENTRI_CF_SOGGETTO, RENTRI_UNITA_LOCALI, } from "@/lib/rentriVpsApi";
const POLL_MS = 5 * 60 * 1000;
function isDaFirmare(d) {
    const stato = String(d?.stato ?? "").toLowerCase();
    const accettato = Boolean(d?.accettazione) || stato.startsWith("accett");
    return !accettato;
}
/**
 * Conta i formulari in arrivo su RENTRI ancora da firmare/accettare.
 * Polling leggero ogni 5 minuti.
 */
export function useFirDaFirmareCount(cliente) {
    const [count, setCount] = useState(0);
    const running = useRef(false);
    useEffect(() => {
        if (!cliente) {
            setCount(0);
            return;
        }
        let active = true;
        const key = rentriConfigKey(cliente);
        const cf = RENTRI_CF_SOGGETTO[key] ?? "";
        const ul = RENTRI_UNITA_LOCALI[key] ?? "";
        if (!cf) {
            setCount(0);
            return;
        }
        const load = async () => {
            if (running.current)
                return;
            running.current = true;
            try {
                const res = await elencoFormulariRentri(cliente, cf, ul);
                if (!active || !res?.success)
                    return;
                const raw = res.data;
                const list = Array.isArray(raw) ? raw : raw?.formulari ?? raw?.items ?? raw?.content ?? [];
                const n = (Array.isArray(list) ? list : []).filter(isDaFirmare).length;
                setCount(n);
            }
            catch {
                /* silenzioso: nessun rumore in UI */
            }
            finally {
                running.current = false;
            }
        };
        load();
        const id = setInterval(load, POLL_MS);
        return () => {
            active = false;
            clearInterval(id);
        };
    }, [cliente]);
    return count;
}
