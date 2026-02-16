import { create } from "zustand";

type Position = { x: number; y: number };

interface ZoliDarkLemonWidgetState {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  position: Position;
  setPosition: (position: Position) => void;
}

function getDefaultPosition(): Position {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return {
    x: Math.max(16, window.innerWidth - 750),
    y: Math.max(16, window.innerHeight - 220),
  };
}

export const useZoliDarkLemonWidgetStore = create<ZoliDarkLemonWidgetState>((set) => ({
  isOpen: false,
  setOpen: (open) => set({ isOpen: open }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  position: getDefaultPosition(),
  setPosition: (position) => set({ position }),
}));
