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
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
  /** Conversazione attiva per ogni vista (laterale, fluttuante, barra, pagina...) */
  conversationBySurface: Record<string, string | null>;
  setSurfaceConversationId: (surface: string, id: string | null) => void;
  topBarCollapsed: boolean;
  setTopBarCollapsed: (collapsed: boolean) => void;
}

const STORAGE_KEY = "dark-lemon-widget";

function getDefaultPosition(): Position {
  if (typeof window === "undefined") return { x: 100, y: 100 };
  return {
    x: Math.max(16, window.innerWidth - 420),
    y: Math.max(16, window.innerHeight - 500),
  };
}

function loadState(): { isOpen: boolean; position: Position; size: Size; topBarCollapsed: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isOpen: !!parsed.isOpen,
        position: parsed.position || getDefaultPosition(),
        size: parsed.size || { width: 380, height: 400 },
        topBarCollapsed: !!parsed.topBarCollapsed,
      };
    }
  } catch {}
  return { isOpen: false, position: getDefaultPosition(), size: { width: 380, height: 400 }, topBarCollapsed: false };
}

function saveState(isOpen: boolean, position: Position, size: Size, topBarCollapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ isOpen, position, size, topBarCollapsed }));
  } catch {}
}

const initial = loadState();

export const useZoliDarkLemonWidgetStore = create<ZoliDarkLemonWidgetState>((set, get) => ({
  isOpen: initial.isOpen,
  setOpen: (open) => {
    set({ isOpen: open });
    saveState(open, get().position, get().size, get().topBarCollapsed);
  },
  toggle: () => {
    const next = !get().isOpen;
    set({ isOpen: next });
    saveState(next, get().position, get().size, get().topBarCollapsed);
  },
  position: initial.position,
  setPosition: (position) => {
    set({ position });
    saveState(get().isOpen, position, get().size, get().topBarCollapsed);
  },
  size: initial.size,
  setSize: (size) => {
    set({ size });
    saveState(get().isOpen, get().position, size, get().topBarCollapsed);
  },
  sidePanel: false,
  setSidePanel: (sidePanel) => set({ sidePanel }),
  isWorking: false,
  setWorking: (isWorking) => set({ isWorking }),
  currentConversationId: null,
  setCurrentConversationId: (currentConversationId) => set({ currentConversationId }),
  topBarCollapsed: initial.topBarCollapsed,
  setTopBarCollapsed: (topBarCollapsed) => {
    set({ topBarCollapsed });
    saveState(get().isOpen, get().position, get().size, topBarCollapsed);
  },
}));
