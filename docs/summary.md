Aggiornato: 2025-12-12T16:32:59.152Z

**Riepilogo Progetto**
- Nome: rentri-fir-sender
- Versione: 1.0.0
- Module: module
- Script: dev, build, start, db:push, summary:watch, plan:compare, plan:coverage, resend:global, resend:multy, remap:global, remap:multy, bulk:xml, bulk:strict
- Dipendenze: 57, Dev: 15
- Librerie principali: @tanstack/react-query, @trpc/server, drizzle-orm, express, react
- Target TS: ES2020
- Module TS: ESNext
- Strict: sì

**Struttura**
- Dir src: presente (25 files)
- Pagine: BridgeStatus.tsx, Certificate.tsx, Dashboard.tsx, Home.tsx, ImportMassivo.tsx, MassiveUpload.tsx, NotFound.tsx, Transactions.tsx, UploadFir.tsx
- Componenti: BulkProgress.tsx, Header.tsx, ui
- Dir server: presente (34 files)
- Endpoint/Script server: authDoctor.ts, authDoctorV2.ts, authSpy.ts, autoOrchestrator.ts, batchSend.ts, bulkSendXml.ts, bulkXml.ts, companyEndpoints.ts, comparePlanWithRentri.ts, db.ts, dumpTransactions.ts, firParser.ts, goldenReplicator.ts, importSender.ts, index.ts, orchestrator.ts, poller.ts, prevalidate.ts, queue.ts, rentriClient.ts
- Bridge .NET: presente

**Operatività**
- Dev: vite + tsx watch server/index.ts
- Build: vite build, Preview: vite preview
- DB: drizzle-kit push

# Conversazioni

- L'assistente non mantiene memoria a lungo termine tra chat diverse; il contesto persiste solo nella sessione corrente.
- Richiesta: creare un riassunto puntato del progetto e applicare una lettura periodica automatica.
- Stato: lettura periodica attiva con watcher su src, server e docs.