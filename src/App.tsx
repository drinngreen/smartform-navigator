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
import { CallManager } from "@/components/calls/CallManager";

// Auth
import AuthPage from "./pages/AuthPage";
import MNAuthPage from "./pages/MNAuthPage";
import MNAdminAuthPage from "./pages/MNAdminAuthPage";
import SuperAdminAuthPage from "./pages/SuperAdminAuthPage";

// Super Admin
import SuperAdminDashboard from "./pages/SuperAdminDashboard";

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
import GestioneFIRPage from "./pages/admin/GestioneFIRPage";
import GPSFlottaPage from "./pages/admin/GPSFlottaPage";
import FatturazionePage from "./pages/admin/FatturazionePage";
import PhonePage from "./pages/admin/PhonePage";
import SMSPage from "./pages/admin/SMSPage";
import WhatsAppPage from "./pages/admin/WhatsAppPage";
import EmailPage from "./pages/admin/EmailPage";
import RubricaPage from "./pages/admin/RubricaPage";

// MultyNiyol Pages
import MNDashboardPage from "./pages/multynijol/MNDashboardPage";
import MNContextDashboardPage from "./pages/multynijol/MNContextDashboardPage";
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
import MNImpiantoProduttorePage from "./pages/multynijol/MNImpiantoProduttorePage";
import MNImpiantoDestinatarioPage from "./pages/multynijol/MNImpiantoDestinatarioPage";
import MNPagamentiPage from "./pages/multynijol/MNPagamentiPage";
import MNRegistroKgPage from "./pages/multynijol/MNRegistroKgPage";
import MNFirDigitaliPage from "./pages/multynijol/MNFirDigitaliPage";
import MNMultyprogetAppPage from "./pages/multynijol/MNMultyprogetAppPage";
import MNNiyolAppPage from "./pages/multynijol/MNNiyolAppPage";
import MNFormulariPage from "./pages/multynijol/MNFormulariPage";
import MNGestioneFIRPage from "./pages/multynijol/MNGestioneFIRPage";
import MNGPSFlottaPage from "./pages/multynijol/MNGPSFlottaPage";
import MNZoliDarkLemonPage from "./pages/multynijol/MNZoliDarkLemonPage";
import MNFatturazionePage from "./pages/multynijol/MNFatturazionePage";
import MNPhonePage from "./pages/multynijol/MNPhonePage";
import MNSMSPage from "./pages/multynijol/MNSMSPage";
import MNWhatsAppPage from "./pages/multynijol/MNWhatsAppPage";
import MNEmailPage from "./pages/multynijol/MNEmailPage";
import MNRubricaPage from "./pages/multynijol/MNRubricaPage";
import MNAnagraficaPrivatiPage from "./pages/multynijol/MNAnagraficaPrivatiPage";
import MNAppCronologiaPage from "./pages/multynijol/MNAppCronologiaPage";
import MNAppGPSPage from "./pages/multynijol/MNAppGPSPage";
import MNAppAIPage from "./pages/multynijol/MNAppAIPage";
import MNAppComunicazioniPage from "./pages/multynijol/MNAppComunicazioniPage";
import MNAppProfiloPage from "./pages/multynijol/MNAppProfiloPage";
import MNAppGuidaPage from "./pages/multynijol/MNAppGuidaPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

function AdminOverlays() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/mn/admin");

  if (!isAdminRoute) return null;

  return <ZoliDarkLemonWidget />;
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

              {/* MultyNiyol auth pages - app login only */}
              <Route path="/mn" element={<MNAuthPage />} />
              <Route path="/ni" element={<MNAuthPage />} />
              <Route path="/mn/auth" element={<MNAuthPage />} />
              <Route path="/mn/auth/:context" element={<MNAuthPage />} />

              {/* Admin auth pages */}
              <Route path="/adminmn" element={<MNAdminAuthPage />} />
              <Route path="/superadmin" element={<SuperAdminAuthPage />} />

              {/* Super Admin Dashboard */}
              <Route path="/super" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />

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
              <Route path="/admin/gestione-fir" element={<ProtectedRoute><GestioneFIRPage /></ProtectedRoute>} />
              <Route path="/admin/gps" element={<ProtectedRoute><GPSFlottaPage /></ProtectedRoute>} />
              <Route path="/admin/fatturazione" element={<ProtectedRoute><FatturazionePage /></ProtectedRoute>} />
              <Route path="/admin/telefono" element={<ProtectedRoute><PhonePage /></ProtectedRoute>} />
              <Route path="/admin/sms" element={<ProtectedRoute><SMSPage /></ProtectedRoute>} />
              <Route path="/admin/whatsapp" element={<ProtectedRoute><WhatsAppPage /></ProtectedRoute>} />
              <Route path="/admin/email" element={<ProtectedRoute><EmailPage /></ProtectedRoute>} />
              <Route path="/admin/rubrica" element={<ProtectedRoute><RubricaPage /></ProtectedRoute>} />

              {/* MultyNijol Admin Routes - PROTECTED */}
              <Route path="/mn/admin" element={<ProtectedRoute><MNDashboardPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context" element={<ProtectedRoute><MNContextDashboardPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/registro" element={<ProtectedRoute><MNRegistroFIRPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/rentri" element={<ProtectedRoute><MNRENTRIPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/trasportatori" element={<ProtectedRoute><MNTrasportatoriPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/transporter-app" element={<ProtectedRoute><MNTransporterAppPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/personale" element={<ProtectedRoute><MNPersonalePage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/messaggi" element={<ProtectedRoute><MNMessagesPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/messaggi/:partnerId" element={<ProtectedRoute><MNMessagesPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/chiamate" element={<ProtectedRoute><MNCallReportsPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/impianto/privati" element={<ProtectedRoute><MNMagazzinoPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/impianto/produttore" element={<ProtectedRoute><MNImpiantoProduttorePage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/impianto/destinatario" element={<ProtectedRoute><MNImpiantoDestinatarioPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/magazzino" element={<ProtectedRoute><MNMagazzinoPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/conferimenti" element={<ProtectedRoute><MNConferimentiPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/impianti" element={<ProtectedRoute><MNImpiantiPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/pagamenti" element={<ProtectedRoute><MNPagamentiPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/registro-kg" element={<ProtectedRoute><MNRegistroKgPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/fir-digitali" element={<ProtectedRoute><MNFirDigitaliPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/formulari" element={<ProtectedRoute><MNFormulariPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/gestione-fir" element={<ProtectedRoute><MNGestioneFIRPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/gps" element={<ProtectedRoute><MNGPSFlottaPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/zoli-dark-lemon" element={<ProtectedRoute><MNZoliDarkLemonPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/fatturazione" element={<ProtectedRoute><MNFatturazionePage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/telefono" element={<ProtectedRoute><MNPhonePage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/sms" element={<ProtectedRoute><MNSMSPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/whatsapp" element={<ProtectedRoute><MNWhatsAppPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/email" element={<ProtectedRoute><MNEmailPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/rubrica" element={<ProtectedRoute><MNRubricaPage /></ProtectedRoute>} />
              <Route path="/mn/admin/:context/anagrafica/privati" element={<ProtectedRoute><MNAnagraficaPrivatiPage /></ProtectedRoute>} />

              {/* MultyNijol Mobile Apps */}
              <Route path="/mn/app/multyproget" element={<MNMultyprogetAppPage />} />
              <Route path="/mn/app/multyproget/cronologia" element={<MNAppCronologiaPage />} />
              <Route path="/mn/app/multyproget/gps" element={<MNAppGPSPage />} />
              <Route path="/mn/app/multyproget/ai" element={<MNAppAIPage />} />
              <Route path="/mn/app/multyproget/comunicazioni" element={<MNAppComunicazioniPage />} />
              <Route path="/mn/app/multyproget/profilo" element={<MNAppProfiloPage />} />
              <Route path="/mn/app/multyproget/guida" element={<MNAppGuidaPage />} />

              <Route path="/mn/app/niyol" element={<MNNiyolAppPage />} />
              <Route path="/mn/app/niyol/cronologia" element={<MNAppCronologiaPage />} />
              <Route path="/mn/app/niyol/gps" element={<MNAppGPSPage />} />
              <Route path="/mn/app/niyol/ai" element={<MNAppAIPage />} />
              <Route path="/mn/app/niyol/comunicazioni" element={<MNAppComunicazioniPage />} />
              <Route path="/mn/app/niyol/profilo" element={<MNAppProfiloPage />} />
              <Route path="/mn/app/niyol/guida" element={<MNAppGuidaPage />} />

              <Route path="/mn/app/messages" element={<ZoliMessagesPage />} />

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
