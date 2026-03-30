import { jsx as _jsx } from "react/jsx-runtime";
import { clsx } from 'clsx';
export function Button({ className, variant = 'primary', ...props }) {
    const base = 'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition';
    const styles = {
        primary: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110',
        ghost: 'bg-transparent text-slate-200 hover:bg-slate-900/50 border border-slate-800'
    };
    return _jsx("button", { className: clsx(base, styles[variant], className), ...props });
}
