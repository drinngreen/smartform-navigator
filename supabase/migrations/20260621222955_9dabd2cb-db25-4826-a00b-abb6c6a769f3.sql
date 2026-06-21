
-- BLOCCO A: Reset storico app autisti Multyproget/Niyol
-- Soft-delete (asimmetrico) di tutte le bozze residue del vecchio sistema
-- che contengono numeri FIR pescati dai serbatoi automatici (aprile 2026).
-- I FIR completati restano visibili. I FIR recenti della segreteria restano.
-- Lo storico resta consultabile dalla segreteria/admin (deleted_by_user filtra solo lato app autista).

UPDATE public.fir_forms
SET deleted_by_user = true,
    updated_at = now()
WHERE tenant_id IN (
    '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid,  -- Multyproget
    '819c783e-78dd-4080-8265-802e75b0d813'::uuid   -- Niyol
  )
  AND status = 'bozza'
  AND created_at < '2026-06-01'::timestamptz
  AND coalesce(deleted_by_user, false) = false;

-- Libera i numeri FIR dei serbatoi che erano riservati a queste bozze archiviate
-- (così non bloccano future operazioni manuali della segreteria).
UPDATE public.fir_number_pool
SET status = 'available',
    reserved_by_fir_id = NULL,
    consumed_at = NULL
WHERE reserved_by_fir_id IN (
  SELECT id FROM public.fir_forms
  WHERE tenant_id IN (
      '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid,
      '819c783e-78dd-4080-8265-802e75b0d813'::uuid
    )
    AND deleted_by_user = true
)
AND status IN ('reserved');

-- Imposta una "reset key" globale: il client la legge e pulisce localStorage/zustand
-- al primo caricamento se la sua copia locale è diversa.
-- Usiamo una semplice tabella di configurazione (creata se non esiste).
CREATE TABLE IF NOT EXISTS public.app_reset_flags (
  scope text PRIMARY KEY,
  reset_token text NOT NULL,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_reset_flags TO anon, authenticated;
GRANT ALL ON public.app_reset_flags TO service_role;

ALTER TABLE public.app_reset_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_reset_flags readable by all" ON public.app_reset_flags;
CREATE POLICY "app_reset_flags readable by all"
  ON public.app_reset_flags FOR SELECT
  USING (true);

INSERT INTO public.app_reset_flags (scope, reset_token, note)
VALUES
  ('multyproget', '2026-06-21-reset-1', 'Reset storico FIR vecchi serbatoi aprile 2026'),
  ('niyol',       '2026-06-21-reset-1', 'Reset storico FIR vecchi serbatoi aprile 2026')
ON CONFLICT (scope) DO UPDATE
SET reset_token = EXCLUDED.reset_token,
    note = EXCLUDED.note,
    updated_at = now();
