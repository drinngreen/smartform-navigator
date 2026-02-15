import React from 'react'
export function Label({ children, htmlFor }: { children: React.ReactNode, htmlFor?: string }){
  return <label htmlFor={htmlFor} className="text-sm text-slate-300">{children}</label>
}