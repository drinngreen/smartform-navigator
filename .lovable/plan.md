
# Piano: Sistema Multi-Tenant Multyproget e Niyol

## Panoramica
Creare un sistema completo dove l'admin multyniyol@zoli.live, dopo il login, vede una pagina con solo due grandi icone (Multyproget e Niyol) con effetto neon. Cliccando su ciascuna, entra in una dashboard identica a quella di Global Reco con drag-and-drop, isolamento dati e context switcher.

## Struttura delle pagine

### 1. Pagine di login utenti app
- **/mn** -- Login trasportatori Multyproget (attualmente su /mn/auth/multyproget, va spostato)
- **/ni** -- Login trasportatori Niyol (attualmente su /mn/auth/niyol, va spostato)
- Entrambe le pagine avranno un link "Accedi come Admin" che rimanda a /mn/admin

### 2. Dashboard Admin iniziale (/mn/admin)
La pagina MNDashboardPage attuale va completamente riscritta:
- Sfondo scuro con griglia tecnica (stile HUD esistente)
- Due icone enormi centrate (le immagini allegate: multyproget.png e niyol.png)
- Ogni icona avra un bordo neon luminoso animato (arancione per Multyproget, ciano per Niyol)
- NO drag-and-drop, posizionamento fisso centrato
- Click su Multyproget naviga a /mn/admin/multyproget
- Click su Niyol naviga a /mn/admin/niyol

### 3. Sub-dashboard per contesto (/mn/admin/multyproget e /mn/admin/niyol)
Pagine identiche alla DashboardPage di Global con:
- Stesse icone desktop (GPS, Personale, Registro FIR, Formulari, ecc.)
- Sistema drag-and-drop completo (DesktopIconGrid)
- Barra di stato sistema
- I link punteranno ai percorsi /mn/admin/multyproget/... e /mn/admin/niyol/...
- Context switcher (dropdown) in alto a sinistra nel TopNav per passare da un tenant all'altro

### 4. Context Switcher
Dropdown nel MNAdminTopNav in alto a sinistra (accanto al logo) che mostra:
- "Multyproget" e "Niyol" come opzioni
- Cambiando contesto, l'utente viene reindirizzato alla dashboard dell'altro tenant
- Lo stato attivo viene gestito dallo store mnContextStore esistente

## File da modificare/creare

### File da copiare nel progetto
- `user-uploads://multyproget-2.png` --> `src/assets/multyproget-icon.png`
- `user-uploads://niyol-2.png` --> `src/assets/niyol-icon.png`

### File da creare
1. **`src/pages/multynijol/MNContextDashboardPage.tsx`** -- La sub-dashboard con DesktopIconGrid identica a Global, parametrizzata sul contesto (multyproget o niyol). Usa le stesse icone di DashboardPage ma con href adattati al prefisso /mn/admin/[contesto]/...

### File da modificare
1. **`src/pages/multynijol/MNDashboardPage.tsx`** -- Riscrittura completa: solo due grandi icone con neon, senza drag-and-drop, senza la griglia di moduli attuale

2. **`src/components/multynijol/MNAdminTopNav.tsx`** -- Aggiunta del context switcher (dropdown) a sinistra. I link di navigazione si adatteranno al contesto attivo.

3. **`src/components/multynijol/MNAdminLayout.tsx`** -- Aggiornamento routeColors per includere i percorsi con contesto

4. **`src/App.tsx`** -- Aggiunta route:
   - `/mn` e `/ni` per le pagine di login
   - `/mn/admin/multyproget` e `/mn/admin/niyol` per le sub-dashboard
   - Route nested per i moduli sotto ogni contesto (es. `/mn/admin/multyproget/registro`)

5. **`src/pages/MNAuthPage.tsx`** -- Aggiunta del link "Accedi come Admin" che punta a /mn/admin. Gestione del contesto automatico basato sul path (se /mn -> multyproget, se /ni -> niyol)

6. **`src/stores/mnContextStore.ts`** -- Adattamento per supportare il routing basato su contesto

## Isolamento dati
L'isolamento per tenant e gia gestito dal campo `mn_context` nei profili e dal `tenant_id`. Le sub-dashboard filtreranno i dati in base al contesto attivo nello store. Questo sara implementato progressivamente nelle singole pagine dei moduli (Personale, Messaggi, Chiamate, ecc.) quando verranno sviluppate.

## Dettagli tecnici

### MNDashboardPage (pagina selettore)
```text
+------------------------------------------+
|            TopNav (senza nav links)       |
+------------------------------------------+
|                                          |
|     [MULTYPROGET]      [NIYOL]           |
|     grande icona       grande icona      |
|     neon arancione     neon ciano        |
|                                          |
+------------------------------------------+
```

### MNContextDashboardPage (sub-dashboard)
```text
+------------------------------------------+
| [Switcher v] TopNav con tutti i link     |
+------------------------------------------+
| Barra stato sistema                      |
+------------------------------------------+
| DesktopIconGrid con drag-and-drop        |
| (stesse icone di Global)                 |
+------------------------------------------+
```

### Routing
```text
/mn                    --> MNAuthPage (contesto=multyproget)
/ni                    --> MNAuthPage (contesto=niyol)
/mn/admin              --> MNDashboardPage (selettore 2 icone)
/mn/admin/multyproget  --> MNContextDashboardPage
/mn/admin/niyol        --> MNContextDashboardPage
/mn/admin/multyproget/registro  --> MNRegistroFIRPage
/mn/admin/niyol/registro        --> MNRegistroFIRPage
... (stessi moduli per entrambi i contesti)
```

Nessuna modifica al database necessaria: le tabelle tenants, profiles e lo store mnContextStore gestiscono gia il multi-tenancy.
