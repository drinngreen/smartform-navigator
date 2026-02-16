import * as React from "react";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
  variant?: "default" | "destructive";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

let count = 0;
function genId() { count = (count + 1) % Number.MAX_SAFE_INTEGER; return count.toString(); }

type Action = { type: "ADD_TOAST"; toast: ToasterToast } | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> } | { type: "DISMISS_TOAST"; toastId?: string } | { type: "REMOVE_TOAST"; toastId?: string };

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const listeners: Array<(state: { toasts: ToasterToast[] }) => void> = [];
let memoryState: { toasts: ToasterToast[] } = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

function reducer(state: typeof memoryState, action: Action): typeof memoryState {
  switch (action.type) {
    case "ADD_TOAST": return { ...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };
    case "UPDATE_TOAST": return { ...state, toasts: state.toasts.map((t) => t.id === action.toast.id ? { ...t, ...action.toast } : t) };
    case "DISMISS_TOAST": {
      const { toastId } = action;
      return { ...state, toasts: state.toasts.map((t) => t.id === toastId || toastId === undefined ? { ...t, open: false } : t) };
    }
    case "REMOVE_TOAST": return action.toastId === undefined ? { ...state, toasts: [] } : { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) };
  }
}

function toast({ ...props }: Omit<ToasterToast, "id">) {
  const id = genId();
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });
  dispatch({ type: "ADD_TOAST", toast: { ...props, id, open: true, onOpenChange: (open) => { if (!open) dismiss(); } } });
  return { id, dismiss, update: (props: Partial<ToasterToast>) => dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } }) };
}

function useToast() {
  const [state, setState] = React.useState(memoryState);
  React.useEffect(() => { listeners.push(setState); return () => { const i = listeners.indexOf(setState); if (i > -1) listeners.splice(i, 1); }; }, []);
  return { ...state, toast, dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }) };
}

export { useToast, toast };
