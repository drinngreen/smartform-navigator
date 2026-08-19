import { create } from "zustand";
const MAX_ENTRIES = 60;
export const useAgentActivityStore = create((set) => ({
    entries: [],
    autopilot: false,
    supervision: null,
    log: (entry) => set((state) => ({
        entries: [
            ...state.entries.slice(-(MAX_ENTRIES - 1)),
            {
                ...entry,
                id: crypto.randomUUID(),
                at: new Date().toISOString(),
                route: typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined,
            },
        ],
    })),
    clear: () => set({ entries: [] }),
    setAutopilot: (value) => set({ autopilot: value }),
    setSupervision: (value) => set({ supervision: value }),
}));
/** Registra un'azione operativa dell'app nel registro visibile a Dark Lemon. */
export function logAgentActivity(action, status = "ok", detail, error) {
    useAgentActivityStore.getState().log({ action, status, detail, error });
}
/** Esegue una promise tracciandone automaticamente esito ed errore. */
export async function trackAgentActivity(action, fn, detail) {
    try {
        const result = await fn();
        logAgentActivity(action, "ok", detail);
        return result;
    }
    catch (e) {
        logAgentActivity(action, "error", detail, e instanceof Error ? e.message : String(e));
        throw e;
    }
}
export function getRecentActivityPayload() {
    return useAgentActivityStore.getState().entries.slice(-30).map((e) => ({
        at: e.at,
        action: e.action,
        status: e.status,
        detail: e.detail,
        error: e.error,
        route: e.route,
    }));
}
