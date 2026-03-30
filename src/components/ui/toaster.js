import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useToast } from "@/hooks/use-toast";
export function Toaster() {
    const { toasts } = useToast();
    return (_jsx("div", { className: "fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:flex-col md:max-w-[420px]", children: toasts.map(({ id, title, description, ...props }) => (_jsxs("div", { className: "mb-2 rounded-lg border border-border bg-card p-4 shadow-lg", children: [title && _jsx("div", { className: "text-sm font-semibold text-foreground", children: title }), description && _jsx("div", { className: "text-sm text-muted-foreground", children: description })] }, id))) }));
}
