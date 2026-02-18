import { create } from "zustand";

type Position = { x: number; y: number };

interface ZoliDarkLemonWidgetState {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  position: Position;
  setPosition: (position: Position) => void;
}

const STORAGE_KEY = "dark-lemon-widget";

function loadState(): { isOpen: boolean; position: Position } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isOpen: !!parsed.isOpen,
        position: parsed.position || getDefaultPosition(),
      };
    }
  } catch {}
  return { isOpen: false, position: getDefaultPosition() };
}

function saveState(isOpen: boolean, position: Position) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ isOpen, position }));
  } catch {}
}

function getDefaultPosition(): Position {
  if (typeof window === "undefined") return { x: 100, y: 100 };
  return {
    x: Math.max(16, window.innerWidth - 420),
    y: Math.max(16, window.innerHeight - 500),
  };
}

const initial = loadState();

export const useZoliDarkLemonWidgetStore = create<ZoliDarkLemonWidgetState>((set, get) => ({
  isOpen: initial.isOpen,
  setOpen: (open) => {
    set({ isOpen: open });
    saveState(open, get().position);
  },
  toggle: () => {
    const next = !get().isOpen;
    set({ isOpen: next });
    saveState(next, get().position);
  },
  position: initial.position,
  setPosition: (position) => {
    set({ position });
    saveState(get().isOpen, position);
  },
}));
