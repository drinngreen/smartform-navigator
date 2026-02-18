import React from 'react'
export function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return <label htmlFor={htmlFor} className={`text-sm text-slate-300 ${className ?? ''}`}>{children}</label>
}
