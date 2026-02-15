import React from 'react'

export function Badge({ children, className = '', variant }: { children: React.ReactNode, className?: string, variant?: 'destructive' | 'default' }){
  const base = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold'
  const styles = variant === 'destructive' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-200'
  return <span className={`${base} ${styles} ${className}`}>{children}</span>
}