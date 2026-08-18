UPDATE public.magazzino_giacenze g
SET descrizione_cer = (
  SELECT m.descrizione_rifiuto FROM public.movimenti_impianto m
  WHERE m.tenant_id = g.tenant_id AND m.cer = g.cer
    AND m.descrizione_rifiuto IS NOT NULL
    AND btrim(m.descrizione_rifiuto) <> ''
    AND m.descrizione_rifiuto !~* 'rettifica di allineamento|allineamento ufficiale|import registro|storno'
  ORDER BY m.data_movimento DESC LIMIT 1
)
WHERE g.descrizione_cer ~* 'rettifica di allineamento|allineamento ufficiale|import registro|storno';