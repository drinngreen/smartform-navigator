import React from "react";
import { Card as BaseCard } from "../../ui/Card";

export const Card = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className }, ref) => {
    return (
      <div ref={ref}>
        <BaseCard className={className}>{children}</BaseCard>
      </div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className }, ref) => (
    <div ref={ref} className={`p-4 border-b border-slate-800 ${className ?? ""}`}>
      {children}
    </div>
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className }, ref) => (
    <div ref={ref} className={`text-lg font-semibold ${className ?? ""}`}>
      {children}
    </div>
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className }, ref) => (
    <div ref={ref} className={`text-sm text-slate-400 ${className ?? ""}`}>
      {children}
    </div>
  )
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className }, ref) => (
    <div ref={ref} className={`p-4 ${className ?? ""}`}>
      {children}
    </div>
  )
);
CardContent.displayName = "CardContent";
