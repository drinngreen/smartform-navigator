# Regole strutturali

- Gli invii RENTRI di agosto 2026 stanno in un dataset separato (inviiRentriAgostoVerificati.json) generato dal CSV "Verifica_Agosto_2026_Accettati_Con_ID_RENTRI" con ID e progressivi letti dal RENTRI; mai riutilizzare ID delle richieste HTTP 202. Il dataset è mostrato sia nel pannello Dev sia nella Console RENTRI (tab registri e invii), perché il preferito "Invii al RENTRI" apre la console.- Giacenze dopo il 21/09: GiacenzeDocumentaliModule somma in sola lettura le righe registro_generale con incide_giacenze=true e le cernite CONFERMATA; nessun trigger né scrittura (le giacenze cambiano solo per operazioni umane).

- DARK LEMON write tools live in supabase/functions/dark-lemon-mn/operativo.ts and require the last user message to contain "CONFERMO" server-side; why: no agent write may happen without explicit human confirmation.
- The unified RENTRI FIR view uses subject-wide GET reads and derives company roles from fiscal codes; why: include intermediary FIRs without mixing tenants or inferring signatures from submission receipts.
- RENTRI formulari list reads use data_emissione_da/data_emissione_a windows (leggiTutteLePagineFormulari); why: RENTRI ignores page/page_size (verified 09/10/2026), so one unfiltered call misses older FIRs.
