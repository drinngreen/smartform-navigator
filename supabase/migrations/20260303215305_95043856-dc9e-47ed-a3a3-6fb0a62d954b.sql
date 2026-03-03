-- Reconcile pool vs FIR forms and harden draft assignment to never pick already-used FIR numbers

-- 1) Mark as RESERVED every available pool number that is already used by an active FIR (bozza/inviato)
UPDATE public.fir_number_pool fp
SET status = 'reserved',
    reserved_by_fir_id = ff.id,
    user_id = ff.user_id,
    assigned_at = COALESCE(fp.assigned_at, now())
FROM public.fir_forms ff
WHERE ff.numero_fir IS NOT NULL
  AND COALESCE(ff.deleted_by_user, false) = false
  AND ff.status IN ('bozza', 'inviato')
  AND fp.fir_number = ff.numero_fir
  AND fp.status = 'available';

-- 2) Mark as CONSUMED every available/reserved pool number already used by completed FIRs
UPDATE public.fir_number_pool fp
SET status = 'consumed',
    consumed_at = COALESCE(fp.consumed_at, now()),
    reserved_by_fir_id = COALESCE(fp.reserved_by_fir_id, ff.id)
FROM public.fir_forms ff
WHERE ff.numero_fir IS NOT NULL
  AND COALESCE(ff.deleted_by_user, false) = false
  AND ff.status = 'completato'
  AND fp.fir_number = ff.numero_fir
  AND fp.status IN ('available', 'reserved');

-- 3) Harden assignment function: never select a pool number already present in non-deleted FIR forms
CREATE OR REPLACE FUNCTION public.ensure_user_has_fir_draft(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_tenant_id uuid;
  v_societa text;
  v_existing_draft uuid;
  v_fir_number text;
  v_pool_id uuid;
  v_new_draft_id uuid;
begin
  if p_user_id is null then return null; end if;

  select p.tenant_id into v_tenant_id
  from public.profiles p where p.user_id = p_user_id;
  if v_tenant_id is null then return null; end if;

  -- Already has an active draft? Return it
  select ff.id into v_existing_draft
  from public.fir_forms ff
  where ff.user_id = p_user_id
    and ff.status = 'bozza'
    and coalesce(ff.deleted_by_user, false) = false
  order by ff.updated_at desc nulls last, ff.created_at desc
  limit 1;
  if v_existing_draft is not null then return v_existing_draft; end if;

  v_societa := public.map_tenant_to_societa(v_tenant_id);

  -- Try to find an available FIR number assigned to this user, excluding numbers already used in non-deleted FIR forms
  select f.id, f.fir_number into v_pool_id, v_fir_number
  from public.fir_number_pool f
  where f.user_id = p_user_id
    and f.status = 'available'
    and f.societa_id = v_societa
    and f.suspended = false
    and not exists (
      select 1
      from public.fir_forms ff
      where ff.numero_fir = f.fir_number
        and coalesce(ff.deleted_by_user, false) = false
    )
  order by f.assigned_at desc nulls last, f.created_at desc
  limit 1
  for update skip locked;

  -- If no personal available number, assign from unassigned stock (also excluding already-used numbers)
  if v_pool_id is null then
    select f.id, f.fir_number into v_pool_id, v_fir_number
    from public.fir_number_pool f
    where f.status = 'available'
      and f.societa_id = v_societa
      and f.user_id = v_zero
      and f.suspended = false
      and not exists (
        select 1
        from public.fir_forms ff
        where ff.numero_fir = f.fir_number
          and coalesce(ff.deleted_by_user, false) = false
      )
    order by f.created_at asc, f.id asc
    limit 1
    for update skip locked;

    if v_pool_id is not null then
      update public.fir_number_pool
      set user_id = p_user_id, assigned_at = now()
      where id = v_pool_id;
    end if;
  end if;

  if v_pool_id is null then
    perform public.notify_fir_pool_empty(v_tenant_id, v_societa, p_user_id);
    return null;
  end if;

  -- Create draft
  insert into public.fir_forms (user_id, tenant_id, status, numero_fir, form_data, allegati, deleted_by_user)
  values (p_user_id, v_tenant_id, 'bozza', v_fir_number, '{}'::jsonb, '[]'::jsonb, false)
  returning id into v_new_draft_id;

  -- Reserve the pool entry immediately
  update public.fir_number_pool
  set status = 'reserved',
      reserved_by_fir_id = v_new_draft_id
  where id = v_pool_id;

  return v_new_draft_id;
end;
$function$;