import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Reset guard per le app autisti Multyproget / Niyol.
 *
 * Confronta il token in `app_reset_flags` con quello salvato localmente.
 * Se differente, pulisce le chiavi di store note (mn-fir-store, fir-store, ...)
 * e ricarica la pagina una sola volta, così l'autista non vede più i vecchi
 * numeri FIR rimasti nello zustand persistente.
 */
const STORAGE_KEYS_TO_CLEAR = [
  'mn-fir-store',
  'fir-store',
  'fir-form-data',
  'mnFirDraft',
  'fir-draft',
];

const LOCAL_KEY_PREFIX = 'app-reset-token:';

export function useAppResetGuard(scope: 'multyproget' | 'niyol') {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc('get_app_reset_token', {
          p_scope: scope,
        });

        const token = typeof data === 'string' ? data : null;
        if (cancelled || error || !token) return;

        const localKey = `${LOCAL_KEY_PREFIX}${scope}`;
        const current = localStorage.getItem(localKey);

        if (current === token) return;

        // Purge store keys
        for (const key of STORAGE_KEYS_TO_CLEAR) {
          try { localStorage.removeItem(key); } catch { /* ignore */ }
        }

        localStorage.setItem(localKey, token);

        // Reload una sola volta, dopo aver impostato il token: niente loop.
        window.location.reload();
      } catch {
        // Silenzioso: in caso di errore non blocchiamo l'app.
      }
    })();

    return () => { cancelled = true; };
  }, [scope]);
}
