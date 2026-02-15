import { clsx } from 'clsx'
import React from 'react'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string
  size?: string
}

export function Button({ className, variant = 'primary', size, ...props }: ButtonProps){
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition font-medium'
  const styles: Record<string, string> = {
    primary: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110',
    ghost: 'bg-transparent text-slate-200 hover:bg-slate-900/50 border border-slate-800',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'bg-transparent border border-slate-700 text-slate-200 hover:bg-slate-800',
  }
  const sizeStyles: Record<string, string> = {
    sm: 'px-3 py-1 text-xs',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2',
  }
  return <button className={clsx(base, styles[variant] || styles.primary, size ? sizeStyles[size] : '', className)} {...props} />
}
