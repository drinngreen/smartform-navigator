import { create } from "zustand";
const STORAGE_KEY = "dark-lemon-widget";
function getDefaultPosition() {
    if (typeof window === "undefined")
        return { x: 100, y: 100 };
    return {
        x: Math.max(16, window.innerWidth - 420),
        y: Math.max(16, window.innerHeight - 500),
    };
}
function loadState() {
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
    }
    catch { }
    return { isOpen: false, position: getDefaultPosition(), size: { width: 380, height: 400 } };
}
function saveState(isOpen, position, size) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ isOpen, position, size }));
    }
    catch { }
}
const initial = loadState();
export const useZoliDarkLemonWidgetStore = create((set, get) => ({
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
}));
