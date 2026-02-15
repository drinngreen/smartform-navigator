import { Link, useLocation } from "wouter"
import { Zap, LayoutDashboard, UploadCloud, FileText, Lock, Play } from "lucide-react"

export function Header() {
  const [location] = useLocation()

  const getLinkClass = (path: string) => {
    const base = "flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium"
    return location === path
      ? `${base} bg-purple-600 text-white shadow-lg shadow-purple-900/20`
      : `${base} text-slate-400 hover:text-white hover:bg-slate-800`
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white fill-current" />
          </div>
          <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            RENTRI Sender
          </span>
        </div>

        <nav className="flex items-center gap-2">
          <Link href="/" className={getLinkClass("/")}> <LayoutDashboard className="h-4 w-4" /> Dashboard </Link>
          <Link href="/carica-fir" className={getLinkClass("/carica-fir")}> <FileText className="h-4 w-4" /> Carica FIR </Link>
          <Link href="/massive" className={getLinkClass("/massive")}> <UploadCloud className="h-4 w-4" /> Import Massivo </Link>
          <Link href="/bridge" className={getLinkClass("/bridge")}> <Lock className="h-4 w-4" /> Bridge Service </Link>
          <Link href="/auto" className={getLinkClass("/auto")}> <Play className="h-4 w-4" /> Invii automatici </Link>
        </nav>
      </div>
    </header>
  )
}
