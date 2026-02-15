import { Router, Switch, Route } from "wouter"
import { QueryClientProvider } from "@tanstack/react-query"
import { trpc, trpcClient, queryClient } from "./lib/trpc"
import { Toaster } from "./components/ui/sonner"
import { Header } from "./components/Header"

import Home from "./pages/Home"
import Transactions from "./pages/Transactions"
import UploadFir from "./pages/UploadFir"
import Certificate from "./pages/Certificate"
import BridgeStatus from "./pages/BridgeStatus"
import MassiveUpload from "./pages/MassiveUpload"
import NotFound from "./pages/NotFound"
import AutoSend from "./pages/AutoSend"

function AppContent() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-purple-500/30">
      <Header />
      <main>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/transazioni" component={Transactions} />
          <Route path="/carica-fir" component={UploadFir} />
          <Route path="/certificato" component={Certificate} />
          <Route path="/bridge" component={BridgeStatus} />
          <Route path="/massive" component={MassiveUpload} />
          <Route path="/auto" component={AutoSend} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Toaster position="top-right" theme="dark" />
    </div>
  )
}

export default function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppContent />
        </Router>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
