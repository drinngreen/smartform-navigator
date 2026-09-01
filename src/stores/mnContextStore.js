import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/safeStorage";
// Solo il tenant Multy Dev è attivo: contiene al suo interno i tab
// Niyol, Impianto e Conto Proprio. I vecchi contesti separati sono disattivati.
export const MN_CONTEXTS = [
    { id: "dev-multyproget", name: "Multy Dev", orgId: "0d9cd11c-4ca8-4e5f-90ab-1529899124b5", tenantId: "77ec9a3d-602e-438f-97bf-1c69abd8f691" },
];
export const useMNContextStore = create()(persist((set) => ({
    activeContext: MN_CONTEXTS[0],
    setActiveContext: (ctx) => set({ activeContext: ctx }),
}), {
    name: "mn-context",
    storage: createJSONStorage(() => safeLocalStorage),
    version: 2,
    migrate: () => ({ activeContext: MN_CONTEXTS[0] }),
}));
