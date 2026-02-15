import React, { createContext, useContext, useMemo, useState } from 'react'

type SelectCtx = {
  value: string
  onValueChange?: (v: string) => void
  items: { value: string; label: string }[]
  addItem: (it: { value: string; label: string }) => void
}

const Ctx = createContext<SelectCtx | null>(null)

export function Select({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }){
  const [items, setItems] = useState<{ value: string; label: string }[]>([])
  const ctx = useMemo<SelectCtx>(() => ({ value, onValueChange, items, addItem: (it) => setItems(prev => prev.some(p=>p.value===it.value)? prev : [...prev, it]) }), [value, onValueChange, items])
  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
}

export function SelectTrigger({ children }: { children: React.ReactNode }){
  const ctx = useContext(Ctx)!
  return (
    <div className="relative">
      <select className="w-full px-3 py-2 rounded-md bg-slate-900/60 border border-slate-800" value={ctx.value} onChange={(e)=>ctx.onValueChange && ctx.onValueChange(e.target.value)}>
        {ctx.items.map(it => <option key={it.value} value={it.value}>{it.label}</option>)}
      </select>
      {children}
    </div>
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }){
  return <span className="sr-only">{placeholder}</span>
}

export function SelectContent({ children }: { children: React.ReactNode }){
  return <>{children}</>
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }){
  const ctx = useContext(Ctx)!
  const label = typeof children === 'string' ? children : (children as any)?.props?.children ?? String(children)
  React.useEffect(()=>{ ctx.addItem({ value, label }) }, [value, label])
  return null
}