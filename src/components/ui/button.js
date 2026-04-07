import { jsx as _jsx } from "react/jsx-runtime";
import { clsx } from "clsx";
import React from "react";
const variantStyles = {
    primary: "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110",
    default: "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110",
    ghost: "bg-transparent hover:bg-white/10 border-none",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline: "bg-transparent border border-slate-700 text-slate-200 hover:bg-slate-800",
};
const sizeStyles = {
    sm: "px-3 py-1 text-xs",
    lg: "px-6 py-3 text-base",
    icon: "p-2",
    default: "",
};
const base = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition font-medium disabled:opacity-50 disabled:pointer-events-none";
export function buttonVariants(opts) {
    const v = opts?.variant || "default";
    const s = opts?.size || "default";
    return clsx(base, variantStyles[v] || variantStyles.default, sizeStyles[s] || "");
}
export const Button = React.forwardRef(({ className, variant = "primary", size, ...props }, ref) => {
    return (_jsx("button", { ref: ref, className: clsx(base, variantStyles[variant] || variantStyles.primary, size ? sizeStyles[size] : "", className), ...props }));
});
Button.displayName = "Button";
