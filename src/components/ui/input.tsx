import React from 'react'
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
  <input ref={ref} {...props} className={`px-3 py-2 rounded-md bg-slate-900/60 border border-slate-800 ${props.className ?? ''}`} />
))
Input.displayName = 'Input'