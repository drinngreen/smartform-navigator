export const safeLocalStorage: Storage = {
  getItem(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn("[storage] localStorage quota/unavailable, skipping write", { key, error });
    }
  },
  removeItem(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // no-op
    }
  },
  clear() {
    try {
      window.localStorage.clear();
    } catch {
      // no-op
    }
  },
  key(index: number) {
    try {
      return window.localStorage.key(index);
    } catch {
      return null;
    }
  },
  get length() {
    try {
      return window.localStorage.length;
    } catch {
      return 0;
    }
  },
};
