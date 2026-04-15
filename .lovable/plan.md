

# Piano Aggiornato: Dark Lemon Side Panel + Copia Testo

## Modifiche rispetto al piano precedente

- **Larghezza Side Panel: 20%** (non 40%)
- **Nessuna cronologia** nel side panel — per aprire conversazioni vecchie, tornare alla vista widget o fullscreen

---

## Parte 1: Side Panel Mode (20% larghezza, senza cronologia)

### Store: `zoliDarkLemonWidgetStore.ts`
- Aggiungere `sidePanel: boolean`, `setSidePanel()`, `isWorking: boolean`, `setWorking()`

### Nuovo: `DarkLemonSidePanel.tsx`
- Pannello fisso a destra, **width: 20vw** (min 280px)
- Contiene SOLO: header, messaggi, input bar, pulsante screenshot
- **NO pulsante cronologia, NO sidebar conversazioni**
- Pulsante per tornare alla vista widget (chiude side panel)
- Pulsante screenshot che cattura l'area di lavoro via `html2canvas`

### Nuovo: `DarkLemonWorkOverlay.tsx`
- Overlay verde semi-trasparente con animazione pulse/onde sull'area di lavoro
- Click per interrompere il flusso AI
- Testo "Dark Lemon sta lavorando..."

### Modifica: `MNAdminLayout.tsx`
- Quando `sidePanel === true`: il contenuto principale si restringe (80vw) e il side panel appare a destra (20vw)
- `ref` sull'area di lavoro per gli screenshot

### Modifica: `ZoliDarkLemonWidget.tsx`
- Nuovo pulsante `PanelRight` nell'header → attiva side panel e chiude widget
- Fix `select-none` (vedi Parte 2)

---

## Parte 2: Selezione e Copia Testo

### Fix selezione
- Rimuovere `select-none` dal container principale del widget
- Mantenere `select-none` solo sull'header (area drag)
- Aggiungere `select-text` alle bolle messaggi

### Nuovo: `MessageCopyButton.tsx`
- Icona `Copy` on-hover su ogni messaggio assistant
- Click → copia contenuto → icona diventa `Check` per 2s
- Integrato in: `ZoliDarkLemonWidget.tsx`, `DarkLemonSidePanel.tsx`, `DarkLemonMNChat.tsx`, `DarkLemonChat.tsx`, `SystemPromptAssistantChat.tsx`, `ChatView.tsx`

---

## File

| Azione | File |
|--------|------|
| Creare | `src/components/ai/DarkLemonSidePanel.tsx` |
| Creare | `src/components/ai/DarkLemonWorkOverlay.tsx` |
| Creare | `src/components/ai/MessageCopyButton.tsx` |
| Modificare | `src/stores/zoliDarkLemonWidgetStore.ts` |
| Modificare | `src/components/multynijol/MNAdminLayout.tsx` |
| Modificare | `src/components/ai/ZoliDarkLemonWidget.tsx` |
| Modificare | `src/components/ai/DarkLemonMNChat.tsx` |
| Modificare | `src/components/ai/DarkLemonChat.tsx` |
| Modificare | `src/components/system-prompt/SystemPromptAssistantChat.tsx` |
| Modificare | `src/components/messages/ChatView.tsx` |
| Installare | `html2canvas` |

