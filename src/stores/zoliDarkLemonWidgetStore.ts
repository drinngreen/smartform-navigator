import { create } from "zustand";

type Position = { x: number; y: number };
type Size = { width: number; height: number };

interface ZoliDarkLemonWidgetState {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  position: Position;
  setPosition: (position: Position) => void;
  size: Size;
  setSize: (size: Size) => void;
  sidePanel: boolean;
  setSidePanel: (open: boolean) => void;
  isWorking: boolean;
  setWorking: (working: boolean) => void;
}

const STORAGE_KEY = "dark-lemon-widget";

function getDefaultPosition(): Position {
  if (typeof window === "undefined") return { x: 100, y: 100 };
  return {
    x: Math.max(16, window.innerWidth - 420),
    y: Math.max(16, window.innerHeight - 500),
  };
}

function loadState(): { isOpen: boolean; position: Position; size: Size } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isOpen: !!parsed.isOpen,
        position: parsed.position || getDefaultPosition(),
        size: parsed.size || { width: 380, height: 400 },
      };
    }
  } catch {}
  return { isOpen: false, position: getDefaultPosition(), size: { width: 380, height: 400 } };
}

function saveState(isOpen: boolean, position: Position, size: Size) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ isOpen, position, size }));
  } catch {}
}

const initial = loadState();

export const useZoliDarkLemonWidgetStore = create<ZoliDarkLemonWidgetState>((set, get) => ({
  isOpen: initial.isOpen,
  setOpen: (open) => {
    set({ isOpen: open });
    saveState(open, get().position, get().size);
  },
  toggle: () => {
    const next = !get().isOpen;
    set({ isOpen: next });
    saveState(next, get().position, get().size);
  },
  position: initial.position,
  setPosition: (position) => {
    set({ position });
    saveState(get().isOpen, position, get().size);
  },
  size: initial.size,
  setSize: (size) => {
    set({ size });
    saveState(get().isOpen, get().position, size);
  },
  sidePanel: false,
  setSidePanel: (sidePanel) => set({ sidePanel }),
  isWorking: false,
  setWorking: (isWorking) => set({ isWorking }),
}));
