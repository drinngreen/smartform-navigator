import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Smartphone, Shield, Server, Truck, Factory, FileText, Users, MessageSquare, Phone, Mail, MapPin, Brain, BarChart3, Building2, Clipboard, QrCode, Database, Globe, Key, Zap, Bell, Layers } from "lucide-react";

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: "overview",
    title: "Panoramica del Sistema",
    icon: <Layers size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Il sistema è una piattaforma multi-tenant per la gestione dei rifiuti conforme al <strong className="text-foreground">RENTRI (Registro Elettronico Nazionale Tracciabilità Rifiuti)</strong>, progettata per tre aziende: <strong className="text-foreground">Global Reco S.R.L.</strong>, <strong className="text-foreground">Multy Proget S.R.L.</strong> e <strong className="text-foreground">Niyol Eticons Logistica SRL SB</strong>.</p>
        <p>L'architettura comprende:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Frontend React</strong> — App mobile per trasportatori e dashboard admin</li>
          <li><strong className="text-foreground">Lovable Cloud (Supabase)</strong> — Database, autenticazione, Edge Functions, storage</li>
          <li><strong className="text-foreground">Server VPS Bridge</strong> (167.235.29.27:3000) — Proxy mTLS con certificati .p12 per le API RENTRI ministeriali</li>
          <li><strong className="text-foreground">Backup automatico</strong> — Cron job orario che esporta l'intero database verso la VPS</li>
        </ul>
      </div>
    ),
  },
  {
    id: "app-trasportatori",
    title: "App Mobile Trasportatori",
    icon: <Smartphone size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Ogni trasportatore accede tramite <code className="text-primary">/app</code> (Global Reco), <code className="text-primary">/mn/app/multyproget</code> o <code className="text-primary">/mn/app/niyol</code>.</p>
        <h4 className="font-semibold text-foreground mt-2">Funzionalità principali:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Compilazione FIR</strong> — Form completo con tutti i campi RENTRI, numeri reali dal pool vidimato</li>
          <li><strong className="text-foreground">Modulo Alternativo</strong> — Compilazione visuale su immagine del formulario ufficiale con zoom e preset</li>
          <li><strong className="text-foreground">Firma e Invio RENTRI</strong> — Emissione FIR digitale con firma via VPS, QR code reale</li>
          <li><strong className="text-foreground">Cronologia</strong> — Storico completo di tutti i FIR con PDF scaricabile</li>
          <li><strong className="text-foreground">GPS in tempo reale</strong> — Tracking continuo della posizione ogni 30 secondi</li>
          <li><strong className="text-foreground">Comunicazioni</strong> — Email, SMS, WhatsApp verso impianti e ufficio</li>
          <li><strong className="text-foreground">Telefono</strong> — Chiamate VoIP integrate tramite Retell AI</li>
          <li><strong className="text-foreground">Assistente AI</strong> — Chat con Dark Lemon per supporto operativo</li>
          <li><strong className="text-foreground">Profilo</strong> — Gestione targa, autista alternativo, avatar</li>
          <li><strong className="text-foreground">Guida</strong> — Istruzioni operative per il trasportatore</li>
        </ul>
        <h4 className="font-semibold text-foreground mt-2">Assegnazione FIR automatica:</h4>
        <p>Il sistema assegna automaticamente un numero FIR reale (vidimato dal Ministero) a ogni trasportatore. Quando un FIR viene inviato, il sistema ne assegna automaticamente uno nuovo dal pool.</p>
      </div>
    ),
  },
  {
    id: "admin-global",
    title: "Dashboard Admin — Global Reco",
    icon: <Building2 size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Accessibile da <code className="text-primary">/admin</code> dopo login come admin Global Reco.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Dashboard</strong> — Panoramica con statistiche FIR, notifiche, utenti online</li>
          <li><strong className="text-foreground">RENTRI</strong> — Console operativa completa per invio di qualsiasi operazione RENTRI (registro, emissione, vidimazione, ricerca, transazioni)</li>
          <li><strong className="text-foreground">Registro FIR</strong> — Visualizzazione e gestione di tutti i formulari (bozze, inviati, completati)</li>
          <li><strong className="text-foreground">Gestione FIR</strong> — Pool numeri: import, richiesta vidimazione, assegnazione utenti</li>
          <li><strong className="text-foreground">Formulari</strong> — Template e configurazione dei campi FIR</li>
          <li><strong className="text-foreground">Personale</strong> — Gestione trasportatori e profili utente</li>
          <li><strong className="text-foreground">GPS Flotta</strong> — Mappa in tempo reale di tutti i trasportatori</li>
          <li><strong className="text-foreground">Fatturazione</strong> — ERP con prima nota, piano conti, fatture elettroniche XML/SDI</li>
          <li><strong className="text-foreground">Intermediazione</strong> — Gestione provvigioni, listini, movimenti intermediario</li>
          <li><strong className="text-foreground">Comunicazioni</strong> — Email (Resend/SendGrid), SMS, WhatsApp, Telefono VoIP</li>
          <li><strong className="text-foreground">Rubrica</strong> — Contatti sincronizzati da anagrafica</li>
          <li><strong className="text-foreground">Aree Riservate Impianti</strong> — Dashboard per impianti destinatari con inbox FIR</li>
          <li><strong className="text-foreground">Social</strong> — Network interno con post, gruppi, chat, leaderboard</li>
        </ul>
      </div>
    ),
  },
  {
    id: "admin-mn",
    title: "Dashboard Admin — Multy Niyol",
    icon: <Factory size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Accessibile da <code className="text-primary">/mn/admin</code>. Gestisce Multyproget, Niyol e i loro impianti con contesti separati.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Hub di selezione</strong> — Scelta contesto: Multyproget, Niyol, Impianti, Dev</li>
          <li><strong className="text-foreground">RENTRI</strong> — Console operativa identica a Global ma con certificati Multy/Niyol</li>
          <li><strong className="text-foreground">Centro Comando Dev</strong> — Moduli avanzati: Anagrafica completa, CER preferiti, Registro C/S, Logistica, Ricevute, Giacenze</li>
          <li><strong className="text-foreground">Conferimenti</strong> — Gestione accettazione rifiuti da privati con pesatura</li>
          <li><strong className="text-foreground">Anagrafica Privati</strong> — Database utenti privati con importazione Excel</li>
          <li><strong className="text-foreground">Magazzino</strong> — Tracciamento giacenze per CER e impianto</li>
          <li><strong className="text-foreground">Pagamenti</strong> — Gestione fatture e pagamenti verso privati</li>
          <li><strong className="text-foreground">Registro Kg</strong> — Contabilità mensile per CER</li>
          <li><strong className="text-foreground">FIR Digitali</strong> — Firma digitale XML per emissione RENTRI</li>
        </ul>
      </div>
    ),
  },
  {
    id: "super-admin",
    title: "Super Admin Dashboard",
    icon: <Shield size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Accessibile da <code className="text-primary">/super</code> (solo <code>superadmin@zoli.live</code>). Opera esclusivamente in <strong className="text-foreground">PRODUZIONE</strong>.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Hub RENTRI</strong> — Operazioni dirette: vidimazione, emissione FIR, firma ricezione, stato transazioni</li>
          <li><strong className="text-foreground">Serbatoio FIR</strong> — Gestione pool numeri per tutte e tre le società</li>
          <li><strong className="text-foreground">Firma Digitale</strong> — Selezione certificato (.p12) per società e firma mTLS</li>
          <li><strong className="text-foreground">Registro C/S</strong> — Trasmissione movimenti di carico/scarico</li>
          <li><strong className="text-foreground">Log Console</strong> — Audit trail di tutte le operazioni RENTRI</li>
          <li><strong className="text-foreground">Editor Formulario</strong> — Posizionamento visuale campi su immagini ufficiali</li>
          <li><strong className="text-foreground">Moderazione Social</strong> — Nascondere contenuti, ammonire utenti</li>
          <li><strong className="text-foreground">System Prompt</strong> — Revisione e approvazione prompt AI per tenant</li>
          <li><strong className="text-foreground">App Demo</strong> — Test end-to-end con numeri fittizi</li>
        </ul>
      </div>
    ),
  },
  {
    id: "rentri-api",
    title: "Integrazione RENTRI",
    icon: <QrCode size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <h4 className="font-semibold text-foreground">Flusso di comunicazione:</h4>
        <div className="bg-secondary/30 rounded-lg p-3 font-mono text-xs">
          Frontend → Edge Function (rentri-vps-proxy) → VPS Bridge (167.235.29.27:3000) → API RENTRI (api.rentri.gov.it)
        </div>
        <h4 className="font-semibold text-foreground mt-2">Operazioni supportate:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">LISTA_BLOCCHI</strong> — GET vidimazione-formulari/v1.0?identificativo=CF</li>
          <li><strong className="text-foreground">VIDIMAZIONE</strong> — POST vidimazione-formulari/v1.0/{'{CODICE_BLOCCO}'}</li>
          <li><strong className="text-foreground">LOTTO / LOTTO_PDF</strong> — Lettura lotto e download PDF</li>
          <li><strong className="text-foreground">FIR_EMISSIONE</strong> — POST formulari/v1.0</li>
          <li><strong className="text-foreground">DETTAGLIO_FIR</strong> — GET formulari/v1.0/{'{UUID}'}</li>
          <li><strong className="text-foreground">RICERCA_FIR</strong> — Ricerca per numero</li>
          <li><strong className="text-foreground">FIRMA_RICEZIONE</strong> — Conferma ricezione dal destinatario</li>
          <li><strong className="text-foreground">REGISTRO</strong> — POST movimenti al registro operatore</li>
          <li><strong className="text-foreground">RICERCA_MOVIMENTI</strong> — Query per data</li>
          <li><strong className="text-foreground">TRANSAZIONE_REGISTRO / TRANSAZIONE_FIR</strong> — Stato asincrono</li>
        </ul>
        <h4 className="font-semibold text-foreground mt-2">Certificati (tenant):</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Global Reco</strong> — CF: 08934760961 · certificato.p12</li>
          <li><strong className="text-foreground">Multy Proget</strong> — CF: 12347770013 · multyproget.p12</li>
          <li><strong className="text-foreground">Niyol</strong> — CF: 09879800010 · niyol.p12</li>
        </ul>
        <h4 className="font-semibold text-foreground mt-2">WAF e Rate Limiting:</h4>
        <p>Il ministero applica rate-limiting dinamico. L'errore <code className="text-red-400">423 sys.issuerIsBanned</code> indica un blocco temporaneo (1-4 ore) per una specifica combinazione IP + CF.</p>
      </div>
    ),
  },
  {
    id: "vps-bridge",
    title: "Server VPS Bridge",
    icon: <Server size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Il server bridge sulla VPS <strong className="text-foreground">167.235.29.27:3000</strong> gestisce la comunicazione mTLS con le API RENTRI ministeriali.</p>
        <h4 className="font-semibold text-foreground mt-2">Requisiti tecnici:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Servizio HTTP (non SOCKS/Tor)</li>
          <li>File .pem decriptati con EC PRIVATE KEY + CERTIFICATE</li>
          <li>Genera firma AgID JWT per ogni richiesta</li>
          <li>Estrae <code className="text-primary">rentri_path</code> e <code className="text-primary">rentri_method</code> dal JSON ricevuto</li>
          <li>Include header Content-Type nella firma anche per GET</li>
          <li>Orario sincronizzato via NTP</li>
        </ul>
        <h4 className="font-semibold text-foreground mt-2">Endpoint:</h4>
        <div className="bg-secondary/30 rounded-lg p-3 font-mono text-xs">
          POST http://167.235.29.27:3000/invia-operazione
        </div>
        <p className="mt-2">Il body contiene: <code className="text-primary">cliente</code>, <code className="text-primary">company</code>, <code className="text-primary">issuer</code>, <code className="text-primary">tipo_operazione</code>, <code className="text-primary">rentri_method</code>, <code className="text-primary">rentri_path</code>, <code className="text-primary">payload</code></p>
      </div>
    ),
  },
  {
    id: "backend-cloud",
    title: "Backend — Lovable Cloud",
    icon: <Database size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <h4 className="font-semibold text-foreground">Database (PostgreSQL):</h4>
        <p>~40+ tabelle tra cui:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><code className="text-primary">profiles</code> — Profili utenti con tenant_id, targa, contesto MN</li>
          <li><code className="text-primary">fir_forms</code> — Formulari compilati dai trasportatori</li>
          <li><code className="text-primary">fir_number_pool</code> — Pool numeri vidimati per assegnazione automatica</li>
          <li><code className="text-primary">organizations / memberships</code> — Struttura multi-tenant RENTRI</li>
          <li><code className="text-primary">fir / fir_events</code> — FIR strutturati con eventi di stato</li>
          <li><code className="text-primary">register_movements</code> — Movimenti registro C/S</li>
          <li><code className="text-primary">rentri_logs</code> — Audit trail operazioni RENTRI</li>
          <li><code className="text-primary">anagrafica_aziende_mp / anagrafica_privati</code> — Anagrafiche</li>
          <li><code className="text-primary">privati_conferimenti</code> — Accettazioni rifiuti da privati</li>
          <li><code className="text-primary">erp_*</code> — Piano conti, prima nota, fatture, codici IVA</li>
          <li><code className="text-primary">social_*</code> — Post, gruppi, messaggi, like</li>
          <li><code className="text-primary">calls / office_calls</code> — Registro chiamate VoIP</li>
          <li><code className="text-primary">driver_locations</code> — Posizioni GPS in tempo reale</li>
        </ul>
        <h4 className="font-semibold text-foreground mt-2">Edge Functions:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><code className="text-primary">rentri-vps-proxy</code> — Orchestratore RENTRI → VPS Bridge</li>
          <li><code className="text-primary">rentri-action-proxy</code> — Proxy per azioni specifiche (emissione)</li>
          <li><code className="text-primary">rentri-get-pdf</code> — Download PDF FIR firmati</li>
          <li><code className="text-primary">rentri-refresh-media</code> — Refresh media RENTRI</li>
          <li><code className="text-primary">ai-agent / social-ai-agent / dark-lemon-mn</code> — Chatbot AI</li>
          <li><code className="text-primary">send-email / send-global-email / send-sms / send-whatsapp</code> — Comunicazioni</li>
          <li><code className="text-primary">retell-call</code> — Avvio chiamate VoIP</li>
          <li><code className="text-primary">admin-user-manage</code> — Gestione utenti admin</li>
          <li><code className="text-primary">impianto-auth</code> — Autenticazione area riservata impianti</li>
          <li><code className="text-primary">db-backup</code> — Backup orario automatico verso VPS</li>
          <li><code className="text-primary">sync-global-inbox</code> — Sincronizzazione email inbox</li>
          <li><code className="text-primary">update-presence</code> — Stato online utenti</li>
        </ul>
        <h4 className="font-semibold text-foreground mt-2">Cron Jobs:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><code className="text-primary">db-backup-hourly</code> — Backup completo ogni ora (via pg_cron + pg_net)</li>
        </ul>
        <h4 className="font-semibold text-foreground mt-2">Storage Buckets:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><code className="text-primary">fir-documents</code> — PDF FIR firmati (pubblico)</li>
          <li><code className="text-primary">documenti-privati</code> — Documenti identità privati (privato)</li>
          <li><code className="text-primary">avatars</code> — Foto profilo (pubblico)</li>
          <li><code className="text-primary">social-media</code> — Immagini post social (pubblico)</li>
          <li><code className="text-primary">message-attachments</code> — Allegati messaggi (privato)</li>
        </ul>
      </div>
    ),
  },
  {
    id: "auth",
    title: "Autenticazione e Ruoli",
    icon: <Key size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <h4 className="font-semibold text-foreground">Livelli di accesso:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Super Admin</strong> — superadmin@zoli.live → /super (operazioni RENTRI produzione)</li>
          <li><strong className="text-foreground">Admin Global Reco</strong> — direzioneglobalreco@zoli.live e altri → /admin</li>
          <li><strong className="text-foreground">Admin Multy Niyol</strong> — multyniyol@zoli.live → /mn/admin</li>
          <li><strong className="text-foreground">Trasportatore</strong> — utenti operativi → /app o /mn/app/*</li>
          <li><strong className="text-foreground">Impianto</strong> — login separato con password hash → /area-impianto/:tenant</li>
          <li><strong className="text-foreground">Social Guest</strong> — utenti solo social con profilo is_social_only</li>
        </ul>
        <h4 className="font-semibold text-foreground mt-2">Sicurezza:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Row Level Security (RLS) su tutte le tabelle</li>
          <li>Funzione <code className="text-primary">has_role()</code> SECURITY DEFINER per evitare ricorsione</li>
          <li>Ruoli nella tabella <code className="text-primary">user_roles</code> (mai nel profilo)</li>
          <li>Bootstrap automatico ruolo admin per email autorizzate</li>
          <li>Isolamento dati per tenant_id</li>
        </ul>
      </div>
    ),
  },
  {
    id: "comunicazioni",
    title: "Comunicazioni",
    icon: <MessageSquare size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-foreground">Email</strong> — Invio tramite SendGrid (Edge Function send-email). Inbox sincronizzato per Global Reco</li>
          <li><strong className="text-foreground">SMS</strong> — Integrazione con provider SMS via Edge Function send-sms</li>
          <li><strong className="text-foreground">WhatsApp</strong> — Invio messaggi WhatsApp via Edge Function send-whatsapp</li>
          <li><strong className="text-foreground">Telefono VoIP</strong> — Chiamate tramite Retell AI con registrazione e trascrizione automatica</li>
          <li><strong className="text-foreground">Messaggi interni</strong> — Chat diretta tra admin e trasportatori con notifiche realtime</li>
          <li><strong className="text-foreground">Rubrica</strong> — Auto-sincronizzata da anagrafiche tramite trigger PostgreSQL</li>
        </ul>
      </div>
    ),
  },
  {
    id: "gps",
    title: "GPS e Tracking",
    icon: <MapPin size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <ul className="list-disc pl-5 space-y-1">
          <li>Tracciamento automatico ogni 30 secondi (opt-out disponibile)</li>
          <li>Posizioni salvate in <code className="text-primary">driver_locations</code> con lat, lng, speed, accuracy</li>
          <li>Associazione automatica al FIR in corso</li>
          <li>Dashboard admin con mappa in tempo reale della flotta</li>
          <li>Filtro per tenant per isolamento dati MN</li>
        </ul>
      </div>
    ),
  },
  {
    id: "ai",
    title: "Intelligenza Artificiale",
    icon: <Brain size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <h4 className="font-semibold text-foreground">Dark Lemon — 3 modalità di vista:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Widget fluttuante</strong> — Bolla draggabile e ridimensionabile sopra l'area di lavoro, persistente tra le pagine</li>
          <li><strong className="text-foreground">Fullscreen</strong> — Vista a schermo intero con cronologia laterale delle conversazioni</li>
          <li><strong className="text-foreground">Side Panel (20% larghezza)</strong> — Pannello laterale destro persistente: il contenuto principale si restringe automaticamente, resta visibile mentre si compilano moduli (Modulo Alternativo, Cernita, ecc.)</li>
        </ul>
        <h4 className="font-semibold text-foreground mt-2">Capacità operative attive:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Screenshot dell'area di lavoro</strong> — Pulsante 📸 dedicato (via html2canvas) o tramite prompt ("fai uno screenshot ed esaminalo")</li>
          <li><strong className="text-foreground">Scrittura real-time nei moduli</strong> — Tag <code className="text-primary">FILL_FORM</code> con delay di 300ms tra i campi: l'utente vede fisicamente la compilazione progressiva del form</li>
          <li><strong className="text-foreground">Form Bridge</strong> — Context globale che espone i campi React (id, label, tipo, valore) all'AI per scrittura mirata</li>
          <li><strong className="text-foreground">Overlay verde "sta lavorando"</strong> — Filtro semi-trasparente con onde animate sull'area di lavoro durante l'attività AI; click per interrompere il flusso</li>
          <li><strong className="text-foreground">ScanSearch (🔍)</strong> — Cattura ~4000 caratteri di contesto pagina + bridge fields per analisi mirata</li>
          <li><strong className="text-foreground">Cronologia condivisa</strong> — Tutte e 3 le viste condividono lo stesso <code className="text-primary">currentConversationId</code>: ogni messaggio finisce in cronologia, le conversazioni vecchie si riaprono dalla vista widget o fullscreen</li>
          <li><strong className="text-foreground">Selezione e copia testo</strong> — Tutti i messaggi sono selezionabili con pulsante 📋 Copia on-hover su ogni risposta assistant in tutte le chat (Widget, Side Panel, Fullscreen, System Prompt, Messaggi)</li>
        </ul>
        <h4 className="font-semibold text-foreground mt-2">Toolkit operativo (49 tool):</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">RENTRI</strong> — Vidimazione, emissione FIR, firma ricezione, ricerca movimenti (richiede "CONFERMO" per firme)</li>
          <li><strong className="text-foreground">Dragon Rifiuti 2</strong> — 7 tool su giacenze, movimenti registro, cernita, miscelazione, tracciabilità (isolati per <code className="text-primary">company_id</code>)</li>
          <li><strong className="text-foreground">Comunicazioni</strong> — Invio email, SMS, WhatsApp, ricerca rubrica e anagrafiche</li>
          <li><strong className="text-foreground">GPS Flotta</strong> — Posizioni real-time dei trasportatori</li>
          <li><strong className="text-foreground">Auto-provisioning</strong> — Crea automaticamente entità mancanti (causali, magazzini) per sbloccare i flussi</li>
        </ul>
        <h4 className="font-semibold text-foreground mt-2">Altri agenti AI:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">AI Agent</strong> — Chatbot per trasportatori con knowledge base e memoria utente persistente</li>
          <li><strong className="text-foreground">Social AI Agent</strong> — Analisi post e moderazione automatica</li>
          <li><strong className="text-foreground">System Prompt</strong> — Prompt personalizzabili per tenant con workflow di approvazione Super Admin</li>
        </ul>
        <p className="mt-2 text-xs">Provider: <strong className="text-foreground">OpenRouter</strong> (google/gemini-2.0-flash) via Edge Function — Lovable AI nativa è disabilitata per Dark Lemon.</p>
      </div>
    ),
  },
  {
    id: "erp",
    title: "ERP e Fatturazione",
    icon: <BarChart3 size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Piano dei Conti</strong> — Struttura gerarchica con conti movimentabili</li>
          <li><strong className="text-foreground">Prima Nota</strong> — Registrazioni contabili con dare/avere e numerazione automatica</li>
          <li><strong className="text-foreground">Fatture di Vendita</strong> — Creazione, modifica, contabilizzazione con righe dettaglio</li>
          <li><strong className="text-foreground">Fatture Elettroniche XML</strong> — Generazione FatturaPA conforme, invio SDI</li>
          <li><strong className="text-foreground">Tabelle Fiscali</strong> — Codici IVA, causali contabili, metodi pagamento</li>
          <li><strong className="text-foreground">Mastrino</strong> — Visione dettagliata movimenti per singolo conto</li>
        </ul>
      </div>
    ),
  },
  {
    id: "social",
    title: "Social Network Interno",
    icon: <Users size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Feed</strong> — Post con immagini, like, commenti</li>
          <li><strong className="text-foreground">Gruppi</strong> — Creazione gruppi con chat dedicata</li>
          <li><strong className="text-foreground">Leaderboard</strong> — Classifica utenti attivi</li>
          <li><strong className="text-foreground">Storie</strong> — Contenuti temporanei</li>
          <li><strong className="text-foreground">Moderazione</strong> — Nascondere post, ammonire utenti (admin)</li>
          <li><strong className="text-foreground">Ospiti Social</strong> — Invito utenti esterni con profilo limitato</li>
          <li>Notifiche realtime per messaggi, like, menzioni</li>
        </ul>
      </div>
    ),
  },
  {
    id: "backup",
    title: "Backup e Sicurezza",
    icon: <Shield size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <h4 className="font-semibold text-foreground">Backup automatico:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Cron job PostgreSQL (pg_cron) ogni ora</li>
          <li>Edge Function <code className="text-primary">db-backup</code> esporta tutte le tabelle pubbliche</li>
          <li>JSON inviato a <code className="text-primary">http://46.224.136.98:4000/upload-backup</code></li>
          <li>Autenticazione tramite secret <code className="text-primary">BACKUP_VPS_SECRET</code></li>
          <li>Filename con timestamp: <code className="text-primary">backup_2026-03-26T14-00-00Z.json</code></li>
        </ul>
        <h4 className="font-semibold text-foreground mt-2">Audit Trail:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tabella <code className="text-primary">rentri_logs</code> per tutte le operazioni RENTRI</li>
          <li>Solo la Service Role Key può inserire log</li>
          <li>Tracciamento per cliente, ruolo, stato, dati inviati, risposta</li>
        </ul>
      </div>
    ),
  },
  {
    id: "notifiche",
    title: "Sistema Notifiche",
    icon: <Bell size={18} />,
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <ul className="list-disc pl-5 space-y-1">
          <li>Notifiche push in-app con campanella globale</li>
          <li>Tipologie: FIR in bozza, pool vuoto, chiamata persa, messaggi, social</li>
          <li>Filtro per <code className="text-primary">app_context</code> e <code className="text-primary">tenant_id</code></li>
          <li>Realtime via Supabase Channels</li>
          <li>Avviso automatico quando il pool FIR si esaurisce (30 min cooldown)</li>
        </ul>
      </div>
    ),
  },
];

export default function GuidaCompletaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["overview"]));

  const isAdmin = location.pathname.startsWith("/admin");
  const isMN = location.pathname.startsWith("/mn");
  const isSuper = location.pathname.startsWith("/super");

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(SECTIONS.map((s) => s.id)));
  const collapseAll = () => setExpandedIds(new Set());

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary/50 transition-all">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-lg tracking-wider">GUIDA COMPLETA</h1>
          <p className="text-xs text-muted-foreground">Documentazione di tutte le funzionalità</p>
        </div>
        <div className="flex gap-1">
          <button onClick={expandAll} className="px-2 py-1 text-[10px] font-mono rounded border border-border/40 hover:bg-secondary/50">
            Espandi
          </button>
          <button onClick={collapseAll} className="px-2 py-1 text-[10px] font-mono rounded border border-border/40 hover:bg-secondary/50">
            Comprimi
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-2 pb-20">
        {SECTIONS.map((section) => {
          const isOpen = expandedIds.has(section.id);
          return (
            <div key={section.id} className="rounded-xl border border-border/30 bg-card/60 overflow-hidden">
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-all"
              >
                <span className="text-primary">{section.icon}</span>
                <span className="flex-1 text-left font-display text-sm tracking-wide">{section.title}</span>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-border/20 pt-3">
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
