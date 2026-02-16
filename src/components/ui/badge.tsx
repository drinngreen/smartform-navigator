import React from 'react'

export function Badge({ children, className = '', variant }: { children: React.ReactNode, className?: string, variant?: 'destructive' | 'default' | 'secondary' | 'outline' }){
  const base = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold'
  const styles = 
    variant === 'destructive' ? 'bg-red-600 text-white' :
    variant === 'secondary' ? 'bg-secondary text-secondary-foreground' :
    variant === 'outline' ? 'border border-border text-foreground bg-transparent' :
    'bg-primary/20 text-primary'
  return <span className={`${base} ${styles} ${className}`}>{children}</span>
}
