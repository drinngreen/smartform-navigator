import { ReactNode } from "react";

interface MobileShellProps {
  children: ReactNode;
  className?: string;
}

export function MobileShell({ children, className = "" }: MobileShellProps) {
  return (
    <div className={`min-h-screen bg-background relative ${className}`}>
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(192, 173, 103, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(192, 173, 103, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '25px 25px',
        }}
      />

      {/* Mobile container with LED border */}
      <div className="relative max-w-md mx-auto min-h-screen">
        {/* Animated LED border */}
        <div className="absolute inset-0 rounded-none md:rounded-3xl p-[1px] bg-gradient-to-b from-primary/30 via-neon-cyan/20 to-primary/30 animate-gradient-shift pointer-events-none" />

        <div className="relative bg-background min-h-screen md:rounded-3xl overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
