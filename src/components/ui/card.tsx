import React from 'react'
import { Card as BaseCard } from '../../ui/Card'

export function Card({ children, className }: { children: React.ReactNode, className?: string }){
  return <BaseCard className={className}>{children}</BaseCard>
}

export function CardHeader({ children, className }: { children: React.ReactNode, className?: string }){
  return <div className={`p-4 border-b border-slate-800 ${className ?? ''}`}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode, className?: string }){
  return <div className={`text-lg font-semibold ${className ?? ''}`}>{children}</div>
}

export function CardDescription({ children, className }: { children: React.ReactNode, className?: string }){
  return <div className={`text-sm text-slate-400 ${className ?? ''}`}>{children}</div>
}

export function CardContent({ children, className }: { children: React.ReactNode, className?: string }){
  return <div className={`p-4 ${className ?? ''}`}>{children}</div>
}
