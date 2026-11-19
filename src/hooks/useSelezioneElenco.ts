import { useCallback, useState } from "react";
import type React from "react";

/**
 * Elenchi e icone: un clic seleziona (evidenzia) la voce senza aprirla,
 * il doppio clic — o Invio sulla voce selezionata — la apre.
 * Ctrl/⌘ + clic aggiunge o toglie una voce dalla selezione.
 * L'evidenziazione è disegnata in index.css tramite data-selezionata.
 */
export function useSelezioneElenco() {
  const [selezionate, setSelezionate] = useState<Set<string>>(new Set());

  const isSelezionata = useCallback((id: string) => selezionate.has(id), [selezionate]);

  const propsVoce = useCallback(
    (id: string, apri: () => void) => ({
      onClick: (e: React.MouseEvent) => {
        if (e.detail > 1) return; // il secondo clic del doppio clic non cambia la selezione
        const multipla = e.ctrlKey || e.metaKey;
        setSelezionate((prev) => {
          const next = new Set(multipla ? prev : []);
          if (multipla && prev.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      },
      onDoubleClick: (e: React.MouseEvent) => {
        e.preventDefault();
        window.getSelection?.()?.removeAllRanges();
        apri();
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          apri();
        }
      },
      tabIndex: 0,
      "aria-selected": selezionate.has(id),
      "data-selezionata": selezionate.has(id) ? "true" : undefined,
      title: "Clic per selezionare · doppio clic per aprire",
    }),
    [selezionate],
  );

  return { isSelezionata, propsVoce, svuota: () => setSelezionate(new Set()) };
}
