CREATE POLICY "Multy Niyol admins insert anagrafica aziende"
ON public.anagrafica_aziende_mp FOR INSERT TO authenticated
WITH CHECK (is_multy_niyol_admin() AND is_allowed_multy_niyol_tenant(tenant_id));

CREATE POLICY "Multy Niyol admins update anagrafica aziende"
ON public.anagrafica_aziende_mp FOR UPDATE TO authenticated
USING (is_multy_niyol_admin() AND is_allowed_multy_niyol_tenant(tenant_id))
WITH CHECK (is_multy_niyol_admin() AND is_allowed_multy_niyol_tenant(tenant_id));

GRANT SELECT, INSERT, UPDATE ON public.anagrafica_aziende_mp TO authenticated;
GRANT ALL ON public.anagrafica_aziende_mp TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rubrica_contatti TO authenticated;
GRANT ALL ON public.rubrica_contatti TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_soggetto_anagrafica(
  p_tenant_id uuid,
  p_ragione_sociale text,
  p_codice_fiscale text DEFAULT NULL,
  p_partita_iva text DEFAULT NULL,
  p_indirizzo text DEFAULT NULL,
  p_comune text DEFAULT NULL,
  p_provincia text DEFAULT NULL,
  p_cap text DEFAULT NULL,
  p_telefono text DEFAULT NULL,
  p_cellulare text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_pec text DEFAULT NULL,
  p_categoria text DEFAULT 'CLIENTE',
  p_autorizzazioni text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_contatto_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat text := upper(coalesce(nullif(trim(p_categoria), ''), 'CLIENTE'));
  v_rs text := nullif(trim(p_ragione_sociale), '');
  v_cf text := nullif(trim(p_codice_fiscale), '');
  v_pi text := nullif(trim(p_partita_iva), '');
  v_az_id uuid;
  v_ct_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;
  IF NOT (has_role(auth.uid(), 'admin') OR is_multy_niyol_admin() OR p_tenant_id = get_user_tenant(auth.uid())) THEN
    RAISE EXCEPTION 'Non autorizzato su questo tenant';
  END IF;
  IF v_rs IS NULL THEN
    RAISE EXCEPTION 'Denominazione obbligatoria';
  END IF;

  SELECT id INTO v_az_id FROM anagrafica_aziende_mp
   WHERE tenant_id = p_tenant_id
     AND ((v_cf IS NOT NULL AND upper(codice_fiscale) = upper(v_cf))
       OR (v_pi IS NOT NULL AND upper(partita_iva) = upper(v_pi))
       OR ((v_cf IS NULL AND v_pi IS NULL) AND upper(ragione_sociale) = upper(v_rs)))
   ORDER BY updated_at DESC LIMIT 1;

  IF v_az_id IS NULL THEN
    INSERT INTO anagrafica_aziende_mp (
      tenant_id, ragione_sociale, codice_fiscale, partita_iva, indirizzo, citta, provincia, cap,
      telefono, cellulare, email, pec, note,
      cliente, fornitore, trasportatore, destinatario, intermediario, attivo
    ) VALUES (
      p_tenant_id, v_rs, v_cf, v_pi, nullif(trim(p_indirizzo), ''), nullif(trim(p_comune), ''),
      nullif(trim(p_provincia), ''), nullif(trim(p_cap), ''), nullif(trim(p_telefono), ''),
      nullif(trim(p_cellulare), ''), nullif(trim(p_email), ''), nullif(trim(p_pec), ''), nullif(trim(p_note), ''),
      v_cat IN ('CLIENTE', 'PRODUTTORE'), v_cat = 'FORNITORE', v_cat = 'TRASPORTATORE',
      v_cat = 'DESTINATARIO', v_cat = 'INTERMEDIARIO', true
    ) RETURNING id INTO v_az_id;
  ELSE
    UPDATE anagrafica_aziende_mp SET
      ragione_sociale = v_rs,
      codice_fiscale = coalesce(v_cf, codice_fiscale),
      partita_iva = coalesce(v_pi, partita_iva),
      indirizzo = coalesce(nullif(trim(p_indirizzo), ''), indirizzo),
      citta = coalesce(nullif(trim(p_comune), ''), citta),
      provincia = coalesce(nullif(trim(p_provincia), ''), provincia),
      cap = coalesce(nullif(trim(p_cap), ''), cap),
      telefono = coalesce(nullif(trim(p_telefono), ''), telefono),
      cellulare = coalesce(nullif(trim(p_cellulare), ''), cellulare),
      email = coalesce(nullif(trim(p_email), ''), email),
      pec = coalesce(nullif(trim(p_pec), ''), pec),
      note = coalesce(nullif(trim(p_note), ''), note),
      cliente = cliente OR v_cat IN ('CLIENTE', 'PRODUTTORE'),
      fornitore = fornitore OR v_cat = 'FORNITORE',
      trasportatore = trasportatore OR v_cat = 'TRASPORTATORE',
      destinatario = destinatario OR v_cat = 'DESTINATARIO',
      intermediario = intermediario OR v_cat = 'INTERMEDIARIO',
      updated_at = now()
    WHERE id = v_az_id;
  END IF;

  IF p_contatto_id IS NOT NULL THEN
    v_ct_id := p_contatto_id;
  ELSE
    SELECT id INTO v_ct_id FROM rubrica_contatti
     WHERE tenant_id = p_tenant_id
       AND ((v_cf IS NOT NULL AND upper(codice_fiscale) = upper(v_cf))
         OR (v_pi IS NOT NULL AND upper(partita_iva) = upper(v_pi))
         OR ((v_cf IS NULL AND v_pi IS NULL) AND upper(coalesce(ragione_sociale, nome)) = upper(v_rs)))
     ORDER BY updated_at DESC LIMIT 1;
  END IF;

  IF v_ct_id IS NULL THEN
    INSERT INTO rubrica_contatti (
      tenant_id, nome, ragione_sociale, codice_fiscale, partita_iva, indirizzo, comune, provincia, cap,
      telefono, cellulare, email, pec, categoria, ruoli, autorizzazioni, note, origine
    ) VALUES (
      p_tenant_id, v_rs, v_rs, v_cf, v_pi, nullif(trim(p_indirizzo), ''), nullif(trim(p_comune), ''),
      nullif(trim(p_provincia), ''), nullif(trim(p_cap), ''), nullif(trim(p_telefono), ''),
      nullif(trim(p_cellulare), ''), nullif(trim(p_email), ''), nullif(trim(p_pec), ''),
      v_cat, v_cat, nullif(trim(p_autorizzazioni), ''), nullif(trim(p_note), ''), 'manuale'
    ) RETURNING id INTO v_ct_id;
  ELSE
    UPDATE rubrica_contatti SET
      nome = coalesce(nullif(nome, ''), v_rs),
      ragione_sociale = v_rs,
      codice_fiscale = coalesce(v_cf, codice_fiscale),
      partita_iva = coalesce(v_pi, partita_iva),
      indirizzo = coalesce(nullif(trim(p_indirizzo), ''), indirizzo),
      comune = coalesce(nullif(trim(p_comune), ''), comune),
      provincia = coalesce(nullif(trim(p_provincia), ''), provincia),
      cap = coalesce(nullif(trim(p_cap), ''), cap),
      telefono = coalesce(nullif(trim(p_telefono), ''), telefono),
      cellulare = coalesce(nullif(trim(p_cellulare), ''), cellulare),
      email = coalesce(nullif(trim(p_email), ''), email),
      pec = coalesce(nullif(trim(p_pec), ''), pec),
      categoria = v_cat,
      ruoli = coalesce(nullif(ruoli, ''), v_cat),
      autorizzazioni = coalesce(nullif(trim(p_autorizzazioni), ''), autorizzazioni),
      note = coalesce(nullif(trim(p_note), ''), note),
      updated_at = now()
    WHERE id = v_ct_id;
  END IF;

  RETURN jsonb_build_object('azienda_id', v_az_id, 'contatto_id', v_ct_id, 'categoria', v_cat, 'ragione_sociale', v_rs);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_soggetto_anagrafica(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, uuid) TO authenticated, service_role;