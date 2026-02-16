import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PresenceProvider } from "@/components/providers/PresenceProvider";
import { CallProvider } from "@/contexts/CallContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleBasedRedirect } from "@/components/RoleBasedRedirect";
import { ZoliDarkLemonWidget } from "@/components/ai/ZoliDarkLemonWidget";
import { useZoliDarkLemonWidgetStore } from "@/stores/zoliDarkLemonWidgetStore";
import { CallManager } from "@/components/calls/CallManager";

// Auth
import AuthPage from "./pages/AuthPage";

// Mobile App Pages
import MobileAppPage from "./pages/MobileAppPage";
import CronologiaFIRPage from "./pages/CronologiaFIRPage";
import GPSPage from "./pages/GPSPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import ComunicazioniPage from "./pages/ComunicazioniPage";
import ZoliMessagesPage from "./pages/ZoliMessagesPage";
import ProfiloPage from "./pages/ProfiloPage";
import GuidaPage from "./pages/GuidaPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";

// Admin Pages
import DashboardPage from "./pages/admin/DashboardPage";
import RENTRIPage from "./pages/admin/RENTRIPage";
import PersonalePage from "./pages/admin/PersonalePage";
import RegistroFIRPage from "./pages/admin/RegistroFIRPage";
import CallReportsPage from "./pages/admin/CallReportsPage";
import AdminMessagesPage from "./pages/admin/AdminMessagesPage";
import ZoliDarkLemonPage from "./pages/admin/ZoliDarkLemonPage";
import FormulariPage from "./pages/admin/FormulariPage";

// MultyNiyol Pages
import MNDashboardPage from "./pages/multynijol/MNDashboardPage";
import MNRegistroFIRPage from "./pages/multynijol/MNRegistroFIRPage";
import MNRENTRIPage from "./pages/multynijol/MNRENTRIPage";
import MNTrasportatoriPage from "./pages/multynijol/MNTrasportatoriPage";
import MNTransporterAppPage from "./pages/multynijol/MNTransporterAppPage";
import MNPersonalePage from "./pages/multynijol/MNPersonalePage";
import MNMessagesPage from "./pages/multynijol/MNMessagesPage";
import MNCallReportsPage from "./pages/multynijol/MNCallReportsPage";
import MNMagazzinoPage from "./pages/multynijol/MNMagazzinoPage";
import MNConferimentiPage from "./pages/multynijol/MNConferimentiPage";
import MNImpiantiPage from "./pages/multynijol/MNImpiantiPage";
import MNPagamentiPage from "./pages/multynijol/MNPagamentiPage";
import MNRegistroKgPage from "./pages/multynijol/MNRegistroKgPage";
import MNFirDigitaliPage from "./pages/multynijol/MNFirDigitaliPage";
import MNMultyprogetAppPage from "./pages/multynijol/MNMultyprogetAppPage";
import MNNiyolAppPage from "./pages/multynijol/MNNiyolAppPage";
import MNFormulariPage from "./pages/multynijol/MNFormulariPage";

import MNAuthPage from "./pages/MNAuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

function AdminOverlays() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/mn/admin");
  const isOpen = useZoliDarkLemonWidgetStore((s) => s.isOpen);
  const setOpen = useZoliDarkLemonWidgetStore((s) => s.setOpen);

  if (!isAdminRoute || !isOpen) return null;

  return <ZoliDarkLemonWidget isOpen={isOpen} onClose={() => setOpen(false)} />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <PresenceProvider>
          <CallProvider>
            <Toaster position="top-right" theme="dark" />
            <CallManager />

            <Routes>
              {/* Auth */}
              <Route path="/auth" element={<AuthPage />} />

              {/* Root redirect based on role */}
              <Route path="/" element={<RoleBasedRedirect />} />

              {/* Profile setup */}
              <Route path="/profile/setup" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />

              {/* Mobile App Routes */}
              <Route path="/app" element={<ProtectedRoute><MobileAppPage /></ProtectedRoute>} />
              <Route path="/app/cronologia" element={<ProtectedRoute><CronologiaFIRPage /></ProtectedRoute>} />
              <Route path="/app/gps" element={<ProtectedRoute><GPSPage /></ProtectedRoute>} />
              <Route path="/app/ai" element={<ProtectedRoute><AIAssistantPage /></ProtectedRoute>} />
              <Route path="/app/comunicazioni" element={<ProtectedRoute><ComunicazioniPage /></ProtectedRoute>} />
              <Route path="/app/profilo" element={<ProtectedRoute><ProfiloPage /></ProtectedRoute>} />
              <Route path="/app/guida" element={<ProtectedRoute><GuidaPage /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/admin/rentri" element={<ProtectedRoute><RENTRIPage /></ProtectedRoute>} />
              <Route path="/admin/personale" element={<ProtectedRoute><PersonalePage /></ProtectedRoute>} />
              <Route path="/admin/registro" element={<ProtectedRoute><RegistroFIRPage /></ProtectedRoute>} />
              <Route path="/admin/chiamate" element={<ProtectedRoute><CallReportsPage /></ProtectedRoute>} />
              <Route path="/admin/messaggi" element={<ProtectedRoute><AdminMessagesPage /></ProtectedRoute>} />
              <Route path="/admin/messaggi/:partnerId" element={<ProtectedRoute><AdminMessagesPage /></ProtectedRoute>} />
              <Route path="/admin/zoli-dark-lemon" element={<ProtectedRoute><ZoliDarkLemonPage /></ProtectedRoute>} />
              <Route path="/admin/formulari" element={<ProtectedRoute><FormulariPage /></ProtectedRoute>} />

              {/* MultyNijol Admin Routes */}
              <Route path="/mn/admin" element={<MNDashboardPage />} />
              <Route path="/mn/admin/registro" element={<MNRegistroFIRPage />} />
              <Route path="/mn/admin/rentri" element={<MNRENTRIPage />} />
              <Route path="/mn/admin/trasportatori" element={<MNTrasportatoriPage />} />
              <Route path="/mn/admin/transporter-app" element={<MNTransporterAppPage />} />
              <Route path="/mn/admin/personale" element={<MNPersonalePage />} />
              <Route path="/mn/admin/messaggi" element={<MNMessagesPage />} />
              <Route path="/mn/admin/chiamate" element={<MNCallReportsPage />} />
              <Route path="/mn/admin/magazzino" element={<MNMagazzinoPage />} />
              <Route path="/mn/admin/conferimenti" element={<MNConferimentiPage />} />
              <Route path="/mn/admin/impianti" element={<MNImpiantiPage />} />
              <Route path="/mn/admin/pagamenti" element={<MNPagamentiPage />} />
              <Route path="/mn/admin/registro-kg" element={<MNRegistroKgPage />} />
              <Route path="/mn/admin/fir-digitali" element={<MNFirDigitaliPage />} />
              <Route path="/mn/admin/formulari" element={<MNFormulariPage />} />

              {/* MultyNijol Mobile Apps */}
              <Route path="/mn/app/multyproget" element={<MNMultyprogetAppPage />} />
              <Route path="/mn/app/niyol" element={<MNNiyolAppPage />} />
              <Route path="/mn/app/messages" element={<ZoliMessagesPage />} />

              {/* MultyNiyol auth pages */}
              <Route path="/mn/auth" element={<MNAuthPage />} />
              <Route path="/mn/auth/:context" element={<MNAuthPage />} />

              {/* Legacy routes redirect */}
              <Route path="/carica-fir" element={<Navigate to="/app" replace />} />
              <Route path="/transazioni" element={<Navigate to="/app/cronologia" replace />} />
              <Route path="/massive" element={<Navigate to="/admin" replace />} />
              <Route path="/bridge" element={<Navigate to="/admin" replace />} />

              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
            </Routes>

            <AdminOverlays />
          </CallProvider>
        </PresenceProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
