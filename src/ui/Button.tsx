import { clsx } from 'clsx'
import React from 'react'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps){
  const base = 'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition'
  const styles = {
    primary: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110',
    ghost: 'bg-transparent text-slate-200 hover:bg-slate-900/50 border border-slate-800'
  }
  return <button className={clsx(base, styles[variant], className)} {...props} />
}