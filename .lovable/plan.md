

## Problema Identificato

L'app si blocca su **schermo bianco** perché `App.tsx` contiene ~80 import statici di pagine. Quando il dev server restituisce un errore 503 transitorio su anche un solo file (in questo caso `SocialPage.tsx`), **l'intero bundle fallisce** e nulla viene renderizzato.

## Soluzione: Lazy Loading delle Pagine

Convertire tutti gli import delle pagine in `React.lazy()` con `<Suspense>` fallback. Questo garantisce che:
- Un errore su una singola pagina **non blocca le altre**
- L'`ErrorBoundary` cattura il crash solo della pagina rotta, non dell'intera app
- Il caricamento è più efficiente (code splitting automatico)

## Piano di Implementazione

### 1. Refactoring `src/App.tsx`
- Sostituire tutti gli ~80 `import XxxPage from "..."` con `const XxxPage = React.lazy(() => import("..."))`
- Wrappare il contenuto di `<Routes>` in `<Suspense fallback={<LoadingScreen />}>`
- Creare un semplice componente `LoadingScreen` inline per il fallback

### 2. Verifica `ErrorBoundary`
- Confermare che `src/components/ErrorBoundary.tsx` gestisce correttamente i chunk failures con un pulsante "Ricarica"

## Dettagli Tecnici

```text
PRIMA (attuale - fragile):
  import SocialPage from "./pages/SocialPage";    ← 503 = app morta
  import MNNiyolAppPage from "./pages/...";
  ... x80 imports

DOPO (resiliente):
  const SocialPage = React.lazy(() => import("./pages/SocialPage"));
  const MNNiyolAppPage = React.lazy(() => import("./pages/..."));
  ... x80 lazy imports
  
  <Suspense fallback={<div>Caricamento...</div>}>
    <Routes>...</Routes>
  </Suspense>
```

Ogni pagina diventa un chunk separato caricato on-demand. Se un chunk fallisce, solo quella rotta mostra l'errore — il resto dell'app continua a funzionare.

