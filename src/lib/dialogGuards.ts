/**
 * Impedisce la chiusura di un Dialog quando l'interazione avviene
 * dentro il pannello/widget Dark Lemon (marcato con data-dark-lemon).
 * Usato sui formulari: scrivere nella chat non deve chiudere il popup.
 */
export function keepOpenOnDarkLemon(event: { detail?: { originalEvent?: Event }; preventDefault: () => void }) {
  const target = (event.detail?.originalEvent?.target ?? null) as Element | null;
  if (target && typeof target.closest === "function" && target.closest("[data-dark-lemon]")) {
    event.preventDefault();
  }
}
