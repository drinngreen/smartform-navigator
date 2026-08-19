export const safeLocalStorage = {
    getItem(key) {
        try {
            return window.localStorage.getItem(key);
        }
        catch {
            return null;
        }
    },
    setItem(key, value) {
        try {
            window.localStorage.setItem(key, value);
        }
        catch (error) {
            console.warn("[storage] localStorage quota/unavailable, skipping write", { key, error });
        }
    },
    removeItem(key) {
        try {
            window.localStorage.removeItem(key);
        }
        catch {
            // no-op
        }
    },
    clear() {
        try {
            window.localStorage.clear();
        }
        catch {
            // no-op
        }
    },
    key(index) {
        try {
            return window.localStorage.key(index);
        }
        catch {
            return null;
        }
    },
    get length() {
        try {
            return window.localStorage.length;
        }
        catch {
            return 0;
        }
    },
};
