import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/safeStorage";

export interface MNContext {
  id: string;
  name: string;
  orgId: string;
  tenantId: string;
}

// Solo il tenant Multy Dev è attivo: contiene al suo interno i tab
// Niyol, Impianto e Conto Proprio. I vecchi contesti separati sono disattivati.
export const MN_CONTEXTS: MNContext[] = [
  { id: "dev-multyproget", name: "Multy Dev", orgId: "0d9cd11c-4ca8-4e5f-90ab-1529899124b5", tenantId: "77ec9a3d-602e-438f-97bf-1c69abd8f691" },
];

interface MNContextStore {
  activeContext: MNContext;
  setActiveContext: (ctx: MNContext) => void;
}

export const useMNContextStore = create<MNContextStore>()(
  persist(
    (set) => ({
      activeContext: MN_CONTEXTS[0],
      setActiveContext: (ctx) => set({ activeContext: ctx }),
    }),
    { name: "mn-context", storage: createJSONStorage(() => safeLocalStorage) }
  )
);
