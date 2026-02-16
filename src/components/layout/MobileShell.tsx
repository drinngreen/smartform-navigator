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
          className="absolute inset-0 rounded-none md:rounded-3xl pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(192,173,103,0.4) 0%, rgba(6,182,212,0.25) 30%, rgba(192,173,103,0.15) 60%, rgba(6,182,212,0.25) 80%, rgba(192,173,103,0.4) 100%)',
            padding: '1px',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            animation: 'gradient-shift 4s ease infinite',
            backgroundSize: '100% 200%',
          }}
        />

        <div className="relative bg-background min-h-screen md:rounded-3xl overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
