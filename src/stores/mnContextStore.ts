import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MNContext {
  id: string;
  name: string;
  orgId: string;
}

export const MN_CONTEXTS: MNContext[] = [
  { id: "multyproget", name: "Multyproget", orgId: "0d9cd11c-4ca8-4e5f-90ab-1529899124b5" },
  { id: "multyproget-intermediario", name: "Multyproget Intermediario", orgId: "99dab27e-0bbf-4536-8f9b-c4a78fd5882e" },
  { id: "niyol", name: "Niyol", orgId: "b3eae77a-e973-425d-b7fb-283007583e72" },
  { id: "multyproget-impianto", name: "Multyproget Impianto", orgId: "eb8f501f-5c6f-4591-9672-49ad3027c027" },
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
    { name: "mn-context" }
  )
);
