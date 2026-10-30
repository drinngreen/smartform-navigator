ALTER TABLE public.fir_forms DROP CONSTRAINT IF EXISTS fir_forms_stato_fisico_check;
ALTER TABLE public.fir_forms ADD CONSTRAINT fir_forms_stato_fisico_check CHECK (
  stato_fisico IS NULL OR stato_fisico = ANY (ARRAY[
    'fangoso','in polvere o pulverulento','liquido','solido','vischioso sciropposo',
    'solido pulverulento','solido non pulverulento','fangoso palabile','aeriforme','altro'
  ]::text[])
);