INSERT INTO public.cliente_autorizzazioni (
  cliente_id,
  tenant_id,
  numero_autorizzazione,
  ente_rilascio,
  data_inizio,
  data_scadenza,
  tipo,
  note
)
SELECT
  a.id,
  a.tenant_id,
  '106-6318/2017',
  'Città Metropolitana di Torino',
  DATE '2017-04-19',
  DATE '2027-04-19',
  'DESTINATARIO',
  'D.Lgs. 152/2006 art. 208 - nuovo impianto; operazione R13. Fonte: elenco ufficiale Città Metropolitana di Torino.'
FROM public.anagrafica_aziende_mp AS a
WHERE a.tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691'
  AND (
    regexp_replace(COALESCE(a.codice_fiscale, ''), '[^0-9]', '', 'g') = '00788730018'
    OR regexp_replace(COALESCE(a.partita_iva, ''), '[^0-9]', '', 'g') = '00788730018'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.cliente_autorizzazioni AS ca
    WHERE ca.cliente_id = a.id
      AND ca.numero_autorizzazione = '106-6318/2017'
  );