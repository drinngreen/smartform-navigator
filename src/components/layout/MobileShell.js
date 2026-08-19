import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function MobileShell({ children, className = "" }) {
    return (_jsxs("div", { className: `min-h-screen bg-background relative ${className}`, children: [_jsx("div", { className: "absolute inset-0 pointer-events-none opacity-25", style: {
                    backgroundImage: `
            linear-gradient(rgba(192, 173, 103, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(192, 173, 103, 0.1) 1px, transparent 1px)
          `,
                    backgroundSize: '25px 25px',
                } }), _jsxs("div", { className: "relative max-w-md mx-auto min-h-screen", children: [_jsx("div", { className: "absolute inset-0 rounded-none md:rounded-3xl pointer-events-none z-10", style: {
                            background: 'linear-gradient(180deg, rgba(251,191,36,1) 0%, rgba(6,182,212,0.9) 15%, rgba(236,72,153,0.8) 30%, rgba(34,197,94,0.9) 50%, rgba(59,130,246,0.8) 65%, rgba(192,173,103,1) 80%, rgba(6,182,212,1) 100%)',
                            padding: '3px',
                            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                            maskComposite: 'exclude',
                            WebkitMaskComposite: 'xor',
                            animation: 'gradient-shift 4s ease infinite',
                            backgroundSize: '100% 300%',
                        } }), _jsx("div", { className: "absolute -inset-2 rounded-none md:rounded-[2rem] pointer-events-none", style: {
                            boxShadow: '0 0 40px rgba(251,191,36,0.5), 0 0 80px rgba(6,182,212,0.3), 0 0 120px rgba(236,72,153,0.2), 0 0 160px rgba(34,197,94,0.15)',
                        } }), _jsx("div", { className: "relative bg-background min-h-screen md:rounded-3xl overflow-hidden", children: children })] })] }));
}
