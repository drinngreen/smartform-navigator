import { ReactNode } from "react";

interface MobileShellProps {
  children: ReactNode;
  className?: string;
}

export function MobileShell({ children, className = "" }: MobileShellProps) {
  return (
    <div className={`min-h-screen bg-background relative ${className}`}>
      {/* Grid overlay - checkered background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(rgba(192, 173, 103, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(192, 173, 103, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '25px 25px',
        }}
      />

      {/* Mobile container with LED border */}
      <div className="relative max-w-md mx-auto min-h-screen">
        {/* Animated LED border - enhanced neon glow */}
        <div 
          className="absolute inset-0 rounded-none md:rounded-3xl pointer-events-none z-10"
          style={{
            background: 'linear-gradient(180deg, rgba(251,191,36,0.6) 0%, rgba(6,182,212,0.4) 15%, rgba(236,72,153,0.3) 30%, rgba(34,197,94,0.4) 50%, rgba(59,130,246,0.3) 65%, rgba(192,173,103,0.4) 80%, rgba(6,182,212,0.5) 100%)',
            padding: '2px',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            animation: 'gradient-shift 4s ease infinite',
            backgroundSize: '100% 300%',
            filter: 'blur(0.5px)',
          }}
        />
        {/* Outer glow */}
        <div 
          className="absolute -inset-1 rounded-none md:rounded-[1.75rem] pointer-events-none"
          style={{
            boxShadow: '0 0 30px rgba(192,173,103,0.2), 0 0 60px rgba(6,182,212,0.1), 0 0 90px rgba(236,72,153,0.05)',
          }}
        />

        <div className="relative bg-background min-h-screen md:rounded-3xl overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
