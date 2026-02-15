import { Link, useLocation } from 'wouter'
import { Home, BookUser, Upload, ShieldCheck, Server } from 'lucide-react'
import React from 'react'

export function Header(){
  const [loc] = useLocation()
  const Item = ({to, icon:Icon, label}:{to:string, icon:React.ComponentType<any>, label:string}) => (
    <Link href={to} className={`px-3 py-2 rounded-md text-sm flex items-center gap-2 no-underline ${loc===to? 'bg-slate-900/60 text-white':'hover:bg-slate-900/40 text-slate-300'}`}>
      <Icon size={16}/> {label}
    </Link>
  )

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 no-underline text-slate-100">
          <img src="https://i.postimg.cc/RFGzCgjJ/Progetto-senza-titolo-(14).png" alt="Zoli Dragon" className="h-8 w-8 rounded-full"/>
          <div>
            <div className="font-semibold zoli-title">Zoli Dragon</div>
            <div className="text-xs text-slate-400">Release 1.16_IRS</div>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Item to="/" icon={Home} label="Home"/>
          <Item to="/anagrafiche" icon={BookUser} label="Anagrafiche"/>
          <Item to="/massive" icon={Upload} label="Import Massivo"/>
          <Item to="/policy" icon={ShieldCheck} label="Policy"/>
          <Item to="/bridge" icon={Server} label="Bridge Service"/>
        </nav>
      </div>
    </header>
  )
}