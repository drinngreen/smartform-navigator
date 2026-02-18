

# Dark Lemon AI -- Widget Persistente e Chat Futuristica

## Panoramica
Rinominare "AI Lemon" in "Dark Lemon" ovunque, trasformare il widget popup in un pannello draggabile persistente (sopravvive a navigazione e refresh), e creare una pagina chat AI futuristica con bordi LED multicolori.

## Modifiche previste

### 1. Rinomina "AI Lemon" in "Dark Lemon"
- `AdminTopNav.tsx` linea 38: label da "AI Lemon" a "Dark Lemon"
- `MNAdminTopNav.tsx` linea 56: label da "AI Lemon" a "Dark Lemon"
- Dashboard icone (DashboardPage.tsx, MNContextDashboardPage.tsx): label "Zoli Dark Lemon" resta corretto, verificare coerenza

### 2. Widget Popup Draggabile e Persistente
Il widget deve:
- Restare aperto anche cambiando pagina (gia' gestito dallo store Zustand)
- Restare aperto dopo il refresh della pagina (salvare stato `isOpen` e `position` in localStorage)
- Essere trascinabile in qualsiasi punto dell'area di lavoro
- Avere bordi LED luminosissimi animati multicolori
- Mostrare il logo Dark Lemon nell'header del popup

**File da modificare:**
- `zoliDarkLemonWidgetStore.ts`: aggiungere persistenza localStorage per `isOpen` e `position`
- `ZoliDarkLemonWidget.tsx`: riscrivere completamente come pannello draggabile con bordi LED, mini-chat integrata
- `App.tsx` (`AdminOverlays`): rimuovere il check `!isOpen` per rendere il componente sempre montato (gestira' internamente la visibilita')

### 3. Chat AI Futuristica (Pagina dedicata)
Le pagine `ZoliDarkLemonPage.tsx` e `MNZoliDarkLemonPage.tsx` verranno trasformate in una chat AI completa con:
- Sfondo scuro profondo
- Bordi LED multicolori animati su ogni elemento (input, messaggi, container)
- Effetti gradient-shift sui bordi
- Integrazione con OpenRouter (come da memoria del progetto) tramite edge function esistente o nuova
- Streaming dei messaggi token-by-token
- Design unico e creativo con glow effects

### 4. Dettagli tecnici del Widget Draggabile

```text
+------------------------------------------+
|  [Logo] Dark Lemon AI            [_] [X] |
|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |  <-- bordo LED multicolore animato
|                                          |
|  [Area chat in miniatura]                |
|  - Ultimi messaggi                       |
|  - Input rapido                          |
|                                          |
|  [Apri Chat Completa]                    |
+------------------------------------------+
```

- Posizione salvata in localStorage (gia' previsto nello store, va solo persistito)
- Drag implementato con mousedown/mousemove/mouseup
- z-index altissimo (z-[9999]) per restare sopra tutto
- Il pulsante nell'header (vicino al telefono) apre/chiude il widget
- Il widget minimizzato diventa un'icona flottante con il logo

### 5. File coinvolti

| File | Azione |
|------|--------|
| `src/stores/zoliDarkLemonWidgetStore.ts` | Persistenza localStorage |
| `src/components/ai/ZoliDarkLemonWidget.tsx` | Riscrittura completa: draggable, LED, mini-chat |
| `src/components/layout/AdminTopNav.tsx` | Rinomina "AI Lemon" -> "Dark Lemon" |
| `src/components/multynijol/MNAdminTopNav.tsx` | Rinomina "AI Lemon" -> "Dark Lemon" |
| `src/App.tsx` | Aggiornare AdminOverlays per persistenza |
| `src/pages/admin/ZoliDarkLemonPage.tsx` | Chat AI futuristica completa |
| `src/pages/multynijol/MNZoliDarkLemonPage.tsx` | Chat AI futuristica (stessa UI) |

### 6. Persistenza garantita
- Lo store Zustand verra' connesso a localStorage tramite un middleware custom
- Al refresh della pagina, lo stato `isOpen: true` viene ripristinato automaticamente
- La posizione del widget viene ripristinata esattamente dove l'utente l'aveva lasciato
- Navigando tra pagine il widget resta montato perche' vive in `App.tsx` fuori dalle Routes

