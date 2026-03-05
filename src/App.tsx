import React, { Suspense } from "react";
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
import { GlobalNotificationBell } from "@/components/notifications/GlobalNotificationBell";

// Lazy-loaded pages
const AuthPage = React.lazy(() => import("./pages/AuthPage"));
const MNAuthPage = React.lazy(() => import("./pages/MNAuthPage"));
const MNAdminAuthPage = React.lazy(() => import("./pages/MNAdminAuthPage"));
const SuperAdminAuthPage = React.lazy(() => import("./pages/SuperAdminAuthPage"));

const SuperAdminDashboard = React.lazy(() => import("./pages/SuperAdminDashboard"));
const SuperAdminFormEditor = React.lazy(() => import("./pages/SuperAdminFormEditor"));
const SocialPage = React.lazy(() => import("./pages/SocialPage"));
const SocialGuestAuthPage = React.lazy(() => import("./pages/SocialGuestAuthPage"));
const SocialAIPage = React.lazy(() => import("./pages/SocialAIPage"));

const MobileAppPage = React.lazy(() => import("./pages/MobileAppPage"));
const CronologiaFIRPage = React.lazy(() => import("./pages/CronologiaFIRPage"));
const GPSPage = React.lazy(() => import("./pages/GPSPage"));
const AIAssistantPage = React.lazy(() => import("./pages/AIAssistantPage"));
const ComunicazioniPage = React.lazy(() => import("./pages/ComunicazioniPage"));
const ZoliMessagesPage = React.lazy(() => import("./pages/ZoliMessagesPage"));
const ProfiloPage = React.lazy(() => import("./pages/ProfiloPage"));
const GuidaPage = React.lazy(() => import("./pages/GuidaPage"));
const AppPhonePage = React.lazy(() => import("./pages/AppPhonePage"));
const ProfileSetupPage = React.lazy(() => import("./pages/ProfileSetupPage"));

const DashboardPage = React.lazy(() => import("./pages/admin/DashboardPage"));
const RENTRIPage = React.lazy(() => import("./pages/admin/RENTRIPage"));
const PersonalePage = React.lazy(() => import("./pages/admin/PersonalePage"));
const RegistroFIRPage = React.lazy(() => import("./pages/admin/RegistroFIRPage"));
const CallReportsPage = React.lazy(() => import("./pages/admin/CallReportsPage"));
const AdminMessagesPage = React.lazy(() => import("./pages/admin/AdminMessagesPage"));
const ZoliDarkLemonPage = React.lazy(() => import("./pages/admin/ZoliDarkLemonPage"));
const FormulariPage = React.lazy(() => import("./pages/admin/FormulariPage"));
const GestioneFIRPage = React.lazy(() => import("./pages/admin/GestioneFIRPage"));
const GPSFlottaPage = React.lazy(() => import("./pages/admin/GPSFlottaPage"));
const FatturazionePage = React.lazy(() => import("./pages/admin/FatturazionePage"));
const IntermediazionePage = React.lazy(() => import("./pages/admin/IntermediazionePage"));
const PhonePage = React.lazy(() => import("./pages/admin/PhonePage"));
const SMSPage = React.lazy(() => import("./pages/admin/SMSPage"));
const WhatsAppPage = React.lazy(() => import("./pages/admin/WhatsAppPage"));
const EmailPage = React.lazy(() => import("./pages/admin/EmailPage"));
const GlobalEmailPage = React.lazy(() => import("./pages/admin/GlobalEmailPage"));
const RubricaPage = React.lazy(() => import("./pages/admin/RubricaPage"));
const SystemPromptPage = React.lazy(() => import("./pages/admin/SystemPromptPage"));
const SocialGuestsPage = React.lazy(() => import("./pages/admin/SocialGuestsPage"));

const MNDashboardPage = React.lazy(() => import("./pages/multynijol/MNDashboardPage"));
const MNContextDashboardPage = React.lazy(() => import("./pages/multynijol/MNContextDashboardPage"));
const MNRegistroFIRPage = React.lazy(() => import("./pages/multynijol/MNRegistroFIRPage"));
const MNRENTRIPage = React.lazy(() => import("./pages/multynijol/MNRENTRIPage"));
const MNTrasportatoriPage = React.lazy(() => import("./pages/multynijol/MNTrasportatoriPage"));
const MNTransporterAppPage = React.lazy(() => import("./pages/multynijol/MNTransporterAppPage"));
const MNPersonalePage = React.lazy(() => import("./pages/multynijol/MNPersonalePage"));
const MNMessagesPage = React.lazy(() => import("./pages/multynijol/MNMessagesPage"));
const MNCallReportsPage = React.lazy(() => import("./pages/multynijol/MNCallReportsPage"));
const MNMagazzinoPage = React.lazy(() => import("./pages/multynijol/MNMagazzinoPage"));
const MNConferimentiPage = React.lazy(() => import("./pages/multynijol/MNConferimentiPage"));
const MNImpiantiPage = React.lazy(() => import("./pages/multynijol/MNImpiantiPage"));
const MNImpiantoProduttorePage = React.lazy(() => import("./pages/multynijol/MNImpiantoProduttorePage"));
const MNImpiantoDestinatarioPage = React.lazy(() => import("./pages/multynijol/MNImpiantoDestinatarioPage"));
const MNPagamentiPage = React.lazy(() => import("./pages/multynijol/MNPagamentiPage"));
const MNRegistroKgPage = React.lazy(() => import("./pages/multynijol/MNRegistroKgPage"));
const MNFirDigitaliPage = React.lazy(() => import("./pages/multynijol/MNFirDigitaliPage"));
const MNMultyprogetAppPage = React.lazy(() => import("./pages/multynijol/MNMultyprogetAppPage"));
const MNNiyolAppPage = React.lazy(() => import("./pages/multynijol/MNNiyolAppPage"));
const MNFormulariPage = React.lazy(() => import("./pages/multynijol/MNFormulariPage"));
const MNGestioneFIRPage = React.lazy(() => import("./pages/multynijol/MNGestioneFIRPage"));
const MNGPSFlottaPage = React.lazy(() => import("./pages/multynijol/MNGPSFlottaPage"));
const MNZoliDarkLemonPage = React.lazy(() => import("./pages/multynijol/MNZoliDarkLemonPage"));
const MNFatturazionePage = React.lazy(() => import("./pages/multynijol/MNFatturazionePage"));
const MNIntermediazionePage = React.lazy(() => import("./pages/multynijol/MNIntermediazionePage"));
const MNPhonePage = React.lazy(() => import("./pages/multynijol/MNPhonePage"));
const MNSMSPage = React.lazy(() => import("./pages/multynijol/MNSMSPage"));
const MNWhatsAppPage = React.lazy(() => import("./pages/multynijol/MNWhatsAppPage"));
const MNEmailPage = React.lazy(() => import("./pages/multynijol/MNEmailPage"));
const MNRubricaPage = React.lazy(() => import("./pages/multynijol/MNRubricaPage"));
const MNAnagraficaPrivatiPage = React.lazy(() => import("./pages/multynijol/MNAnagraficaPrivatiPage"));
const MNStoricoRicevutePage = React.lazy(() => import("./pages/multynijol/MNStoricoRicevutePage"));
const MNSystemPromptPage = React.lazy(() => import("./pages/multynijol/MNSystemPromptPage"));
const MNDevDashboardPage = React.lazy(() => import("./pages/multynijol/MNDevDashboardPage"));
const MNAppCronologiaPage = React.lazy(() => import("./pages/multynijol/MNAppCronologiaPage"));
const MNAppGPSPage = React.lazy(() => import("./pages/multynijol/MNAppGPSPage"));
const MNAppAIPage = React.lazy(() => import("./pages/multynijol/MNAppAIPage"));
const MNAppComunicazioniPage = React.lazy(() => import("./pages/multynijol/MNAppComunicazioniPage"));
const MNAppPhonePage = React.lazy(() => import("./pages/multynijol/MNAppPhonePage"));
const MNAppProfiloPage = React.lazy(() => import("./pages/multynijol/MNAppProfiloPage"));
const MNAppGuidaPage = React.lazy(() => import("./pages/multynijol/MNAppGuidaPage"));

const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      </div>
    </div>
  );
}

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
            <GlobalNotificationBell />

            <Suspense fallback={<LoadingScreen />}>
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
                <Route path="/super/form-editor" element={<ProtectedRoute><SuperAdminFormEditor /></ProtectedRoute>} />

                {/* Social Network */}
                <Route path="/social" element={<ProtectedRoute><SocialPage /></ProtectedRoute>} />
                <Route path="/social/ai" element={<ProtectedRoute><SocialAIPage /></ProtectedRoute>} />
                <Route path="/social/guest" element={<SocialGuestAuthPage />} />

                {/* Root redirect based on role */}
                <Route path="/" element={<RoleBasedRedirect />} />

                {/* Profile setup */}
                <Route path="/profile/setup" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />

                {/* Mobile App Routes */}
                <Route path="/app" element={<ProtectedRoute><MobileAppPage /></ProtectedRoute>} />
                <Route path="/app/cronologia" element={<ProtectedRoute><CronologiaFIRPage /></ProtectedRoute>} />
                <Route path="/app/gps" element={<ProtectedRoute><GPSPage /></ProtectedRoute>} />
                <Route path="/app/ai" element={<ProtectedRoute><AIAssistantPage /></ProtectedRoute>} />
                <Route path="/app/telefono" element={<ProtectedRoute><AppPhonePage /></ProtectedRoute>} />
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
                <Route path="/admin/intermediazione" element={<ProtectedRoute><IntermediazionePage /></ProtectedRoute>} />
                <Route path="/admin/telefono" element={<ProtectedRoute><PhonePage /></ProtectedRoute>} />
                <Route path="/admin/sms" element={<ProtectedRoute><SMSPage /></ProtectedRoute>} />
                <Route path="/admin/whatsapp" element={<ProtectedRoute><WhatsAppPage /></ProtectedRoute>} />
                <Route path="/admin/email" element={<ProtectedRoute><EmailPage /></ProtectedRoute>} />
                <Route path="/admin/email-global" element={<ProtectedRoute><GlobalEmailPage /></ProtectedRoute>} />
                <Route path="/admin/rubrica" element={<ProtectedRoute><RubricaPage /></ProtectedRoute>} />
                <Route path="/admin/system-prompt" element={<ProtectedRoute><SystemPromptPage /></ProtectedRoute>} />
                <Route path="/admin/social-guests" element={<ProtectedRoute><SocialGuestsPage /></ProtectedRoute>} />

                {/* MultyNijol Admin Routes - PROTECTED */}
                <Route path="/mn/admin" element={<ProtectedRoute><MNDashboardPage /></ProtectedRoute>} />
                <Route path="/mn/admin/dev-multyproget" element={<ProtectedRoute><MNDevDashboardPage /></ProtectedRoute>} />
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
                <Route path="/mn/admin/:context/intermediazione" element={<ProtectedRoute><MNIntermediazionePage /></ProtectedRoute>} />
                <Route path="/mn/admin/:context/telefono" element={<ProtectedRoute><MNPhonePage /></ProtectedRoute>} />
                <Route path="/mn/admin/:context/sms" element={<ProtectedRoute><MNSMSPage /></ProtectedRoute>} />
                <Route path="/mn/admin/:context/whatsapp" element={<ProtectedRoute><MNWhatsAppPage /></ProtectedRoute>} />
                <Route path="/mn/admin/:context/email" element={<ProtectedRoute><MNEmailPage /></ProtectedRoute>} />
                <Route path="/mn/admin/:context/rubrica" element={<ProtectedRoute><MNRubricaPage /></ProtectedRoute>} />
                <Route path="/mn/admin/:context/anagrafica/privati" element={<ProtectedRoute><MNAnagraficaPrivatiPage /></ProtectedRoute>} />
                <Route path="/mn/admin/:context/storico-ricevute" element={<ProtectedRoute><MNStoricoRicevutePage /></ProtectedRoute>} />
                <Route path="/mn/admin/:context/system-prompt" element={<ProtectedRoute><MNSystemPromptPage /></ProtectedRoute>} />

                {/* MultyNijol Mobile Apps */}
                <Route path="/mn/app/multyproget" element={<MNMultyprogetAppPage />} />
                <Route path="/mn/app/multyproget/cronologia" element={<MNAppCronologiaPage />} />
                <Route path="/mn/app/multyproget/gps" element={<MNAppGPSPage />} />
                <Route path="/mn/app/multyproget/ai" element={<MNAppAIPage />} />
                <Route path="/mn/app/multyproget/telefono" element={<MNAppPhonePage />} />
                <Route path="/mn/app/multyproget/comunicazioni" element={<MNAppComunicazioniPage />} />
                <Route path="/mn/app/multyproget/profilo" element={<MNAppProfiloPage />} />
                <Route path="/mn/app/multyproget/guida" element={<MNAppGuidaPage />} />

                <Route path="/mn/app/niyol" element={<MNNiyolAppPage />} />
                <Route path="/mn/app/niyol/cronologia" element={<MNAppCronologiaPage />} />
                <Route path="/mn/app/niyol/gps" element={<MNAppGPSPage />} />
                <Route path="/mn/app/niyol/ai" element={<MNAppAIPage />} />
                <Route path="/mn/app/niyol/telefono" element={<MNAppPhonePage />} />
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
            </Suspense>

            <AdminOverlays />
          </CallProvider>
        </PresenceProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
