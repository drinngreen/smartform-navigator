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
        const { data, error } = await supabase
          .from('app_reset_flags')
          .select('reset_token')
          .eq('scope', scope)
          .maybeSingle();

        if (cancelled || error || !data?.reset_token) return;

        const localKey = `${LOCAL_KEY_PREFIX}${scope}`;
        const current = localStorage.getItem(localKey);

        if (current === data.reset_token) return;

        // Purge store keys
        for (const key of STORAGE_KEYS_TO_CLEAR) {
          try { localStorage.removeItem(key); } catch { /* ignore */ }
        }

        localStorage.setItem(localKey, data.reset_token);

        // Reload una sola volta, dopo aver impostato il token: niente loop.
        window.location.reload();
      } catch {
        // Silenzioso: in caso di errore non blocchiamo l'app.
      }
    })();

    return () => { cancelled = true; };
  }, [scope]);
}
