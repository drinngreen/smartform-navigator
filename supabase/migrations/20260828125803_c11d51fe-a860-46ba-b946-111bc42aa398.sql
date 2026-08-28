-- 1) Relink conferimenti agganciati a duplicati "vuoti" dell'anagrafica
WITH norm AS (
  SELECT a.id, a.tenant_id,
    (SELECT string_agg(w,' ' ORDER BY w) FROM unnest(string_to_array(regexp_replace(upper(coalesce(a.cognome,'')||' '||coalesce(a.nome,'')),'\s+',' ','g'),' ')) w) AS key,
    a.targa_automezzo, a.automezzo, a.veicoli
  FROM public.anagrafica_privati a
), good AS (
  SELECT DISTINCT ON (key) key, id, targa_automezzo, automezzo
  FROM norm
  WHERE coalesce(targa_automezzo,'') <> ''
  ORDER BY key, id
)
UPDATE public.privati_conferimenti c
SET privato_id = g.id
FROM norm n, good g
WHERE c.privato_id = n.id
  AND coalesce(n.targa_automezzo,'') = ''
  AND g.key = n.key
  AND g.id <> n.id;

-- 2) Backfill targa/modello sul movimento dai dati anagrafici
UPDATE public.privati_conferimenti c
SET targa_automezzo = NULLIF(coalesce(NULLIF(c.targa_automezzo,''), a.targa_automezzo, a.veicoli->0->>'targa'),''),
    modello_automezzo = NULLIF(coalesce(NULLIF(c.modello_automezzo,''), a.automezzo, a.veicoli->0->>'modello'),'')
FROM public.anagrafica_privati a
WHERE a.id = c.privato_id
  AND (coalesce(c.targa_automezzo,'') = '' OR coalesce(c.modello_automezzo,'') = '');

-- 3) Rinumerazione progressivi senza buchi per tenant/anno
WITH ord AS (
  SELECT id, tenant_id, anno_dbt,
         row_number() OVER (PARTITION BY tenant_id, anno_dbt ORDER BY data, created_at) AS rn
  FROM public.privati_conferimenti
  WHERE anno_dbt IS NOT NULL
)
UPDATE public.privati_conferimenti c
SET numero_progressivo = -o.rn
FROM ord o WHERE o.id = c.id;

WITH ord AS (
  SELECT id, row_number() OVER (PARTITION BY tenant_id, anno_dbt ORDER BY data, created_at) AS rn
  FROM public.privati_conferimenti
  WHERE anno_dbt IS NOT NULL
)
UPDATE public.privati_conferimenti c
SET numero_progressivo = o.rn
FROM ord o WHERE o.id = c.id;