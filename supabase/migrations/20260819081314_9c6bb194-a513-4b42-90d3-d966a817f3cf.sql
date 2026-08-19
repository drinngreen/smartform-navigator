UPDATE public.fir_forms
SET status = 'bozza',
    submitted_at = NULL,
    completed_at = NULL,
    deleted_by_user = false,
    updated_at = now(),
    form_data = COALESCE(form_data, '{}'::jsonb) || jsonb_build_object(
      '_import_source', 'visualizza_formulari_multy_17_08_2026',
      '_moved_to_drafts_at', now()
    )
WHERE tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid
  AND form_data->>'_import_source' = 'visualizza_formulari_multy_17_08_2026'
  AND numero_fir IN (
    'BPJMG 000476 QQ',
    'BPJMG 000477 HQ',
    'BPJMG 000478 JV',
    'BPJMG 000479 NX',
    'BPJMG 000480 PX',
    'CKZLY 013968 PW',
    'CKZLY 013969 DP',
    'CKZLY 013970 NQ',
    'HQXVN 000244 FG',
    'HQXVN 000245 MJ',
    'ZRZXR 000765 LF',
    'ZRZXR 000766 HH',
    'ZRZXR 000767 MH',
    'ZRZXR 000768 BH',
    'ZRZXR 000769 BY',
    'ZRZXR 000770 BG'
  );