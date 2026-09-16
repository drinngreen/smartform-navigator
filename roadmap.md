# Verifica operativa pre-controllo

- [x] Eseguire gate completo applicativo e smoke test rotte
- [x] Eseguire prova reale e reversibile di cernita con saldi prima/dopo
- [x] Verificare comparsa dei movimenti di cernita nel Registro Generale
- [x] Verificare nel browser le tendine FIR (CER, soggetti, autisti)
- [x] Verificare salute database e coerenza finale senza anomalie operative
- [x] Ricostruire lo stato corretto da conversazioni e allegati storici senza alterare il pregresso
- [x] Ripristinare la visibilità delle sole cernite corrette ed escludere esclusivamente quella indicata dal cliente
- [x] Allineare giacenze a saldi 2025, registro 2026 e privati senza valori negativi né doppi conteggi
- [x] Aggiornare Dark Lemon, guida e tutorial dopo la verifica reale completa
- [ ] Elenco reale RENTRI (3 registri, 3.007 righe) analizzato solo in lettura; attendere istruzioni su come usarlo per lo stato "inviato".
- [ ] Certificare in sola lettura app autisti Multy/Niyol, uso d'ufficio, assegnazioni, firme e QR ufficiale.
- [ ] Certificare in sola lettura collegamento RENTRI, pesca FIR, registri, code, 423 e isolamento tenant.
- [ ] Dimostrare con snapshot prima/dopo che test e navigazione non modificano giacenze o cernite.
- [x] Correggere esclusivamente i difetti applicativi emersi, senza scritture operative, poi ripetere tutte le prove.
- [x] Aggiornare Dark Lemon, tutorial e guide soltanto con funzioni realmente verificate e limiti ancora aperti.

## Limiti ancora bloccanti per la certificazione completa

- [ ] Eseguire una prova reale RENTRI autorizzata, completa e reversibile: nessun invio reale è stato eseguito durante l'audit in sola lettura.
- [ ] Unificare tecnicamente anche privati, cernite e conferma cartacea nello stesso punto database, senza cambiare dati storici e senza interrompere le cernite.
- [ ] Eliminare gli stati RENTRI determinati da testo libero e introdurre riconciliazione esplicita degli invii rimasti in attesa.
- [ ] Chiudere i finding di sicurezza pertinenti: il controllo attuale riporta ancora 69 segnalazioni.
- [ ] Produrre il referto di certificazione RENTRI dove ogni voce riporta la prova a cui si riferisce.
- [ ] Stop immediato obbligatorio se una prova altera i saldi fuori dai percorsi autorizzati (regola permanente del piano).
- [x] Prove automatiche di certificazione RENTRI (65 test, verifica superata 09:08) con referto in docs/REFERTO_CERTIFICAZIONE_RENTRI_2026-09-16.md
- [x] Controlli di collegamento in sola lettura RENTRI per Multy e Niyol (blocchi reali ricevuti 09:09)
- [ ] Prova reale guidata di invio (1 FIR Multy scelto dall'utente, poi Niyol) — in attesa di via libera
- [x] Regola giacenze da FIR produttore Multy: solo formulari digitali datati da oggi ore 08:00 (ora italiana) in poi — mai lo storico (src/lib/firProduttoreGiacenza.ts, 8 prove)
- [ ] Anagrafica automatica: nuove aziende e nuove sedi operative salvate dal formulario senza duplicati
- [ ] Separare i due invii RENTRI: partenza (emissione+firma) e arrivo (peso, esito, firma destinatario) con chiusura e giacenze solo dopo esito positivo

## Stabilizzazione operativa urgente — 17/09/2026

- [ ] Rendere univoco lo stato di ogni FIR confrontando archivio locale e stato reale RENTRI, senza etichette contraddittorie.
- [ ] Rendere visibili e utilizzabili dall'impianto i FIR in arrivo: pesata, esito, firma destinatario e motivo completo degli errori.
- [ ] Dimostrare che app autisti e uso d'ufficio condividono lo stesso FIR, con partenza bloccata senza conferma e QR ufficiali.
- [ ] Inventariare e bloccare ogni percorso non autorizzato che può modificare giacenze; verificare cernite e saldi prima/dopo.
- [ ] Rendere Dark Lemon utile solo per diagnosi e preparazione assistita, mantenendo ogni effetto operativo subordinato alla conferma umana.
- [ ] Produrre un referto operativo con prova associata a ogni voce e limiti non ancora certificabili.
- [x] Separare nella Console RENTRI gli invii reali dai controlli automatici GET/PDF e rendere leggibili i tentativi effettivi.
- [x] Evidenziare nel formulario i campi rifiutati dal RENTRI in rosso; ripristinare il colore normale dopo la correzione e azzerare gli errori dopo conferma.
