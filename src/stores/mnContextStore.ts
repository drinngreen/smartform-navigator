import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MNContext {
  id: string;
  name: string;
  orgId: string;
  tenantId: string;
}

export const MN_CONTEXTS: MNContext[] = [
  { id: "multyproget", name: "Multyproget", orgId: "0d9cd11c-4ca8-4e5f-90ab-1529899124b5", tenantId: "77ec9a3d-602e-438f-97bf-1c69abd8f691" },
  { id: "multyproget-intermediario", name: "Multyproget Intermediario", orgId: "99dab27e-0bbf-4536-8f9b-c4a78fd5882e", tenantId: "77ec9a3d-602e-438f-97bf-1c69abd8f691" },
  { id: "niyol", name: "Niyol", orgId: "b3eae77a-e973-425d-b7fb-283007583e72", tenantId: "819c783e-78dd-4080-8265-802e75b0d813" },
  { id: "multyproget-impianto", name: "Multyproget Impianto", orgId: "eb8f501f-5c6f-4591-9672-49ad3027c027", tenantId: "77ec9a3d-602e-438f-97bf-1c69abd8f691" },
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
