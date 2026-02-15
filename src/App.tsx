import { Router, Switch, Route, Redirect } from "wouter"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "./components/ui/sonner"
import { useState, useEffect } from "react"

import Auth from "./pages/Auth"
import Home from "./pages/Home"
import Transactions from "./pages/Transactions"
import UploadFir from "./pages/UploadFir"
import Certificate from "./pages/Certificate"
import BridgeStatus from "./pages/BridgeStatus"
import MassiveUpload from "./pages/MassiveUpload"
import NotFound from "./pages/NotFound"
import AutoSend from "./pages/AutoSend"

const queryClient = new QueryClient()

function AppContent() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState(false)

  useEffect(() => {
    let sub: any = null
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.auth.onAuthStateChange((_event: string, session: any) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })
      sub = supabase.auth.onAuthStateChange
      supabase.auth.getSession().then(({ data: { session } }: any) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })
    }).catch(() => {
      setInitError(true)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-amber-400 animate-pulse text-lg tracking-wider">ZOLI DRAGON</div>
      </div>
    )
  }

  if (initError || !user) {
    return (
      <Switch>
        <Route path="/auth" component={Auth} />
        <Route>
          <Redirect to="/auth" />
        </Route>
      </Switch>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <main>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/transazioni" component={Transactions} />
          <Route path="/carica-fir" component={UploadFir} />
          <Route path="/certificato" component={Certificate} />
          <Route path="/bridge" component={BridgeStatus} />
          <Route path="/massive" component={MassiveUpload} />
          <Route path="/auto" component={AutoSend} />
          <Route path="/auth">
            <Redirect to="/" />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </main>
      <Toaster position="top-right" theme="dark" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  )
}
