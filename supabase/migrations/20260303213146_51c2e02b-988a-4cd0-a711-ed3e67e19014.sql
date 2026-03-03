
-- FIX CRITICO: ensure_user_has_fir_draft deve RISERVARE il numero nel pool dopo la creazione della bozza
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

  -- Try to find an available FIR number assigned to this user
  select f.id, f.fir_number into v_pool_id, v_fir_number
  from public.fir_number_pool f
  where f.user_id = p_user_id and f.status = 'available'
    and f.societa_id = v_societa and f.suspended = false
  order by f.assigned_at desc nulls last, f.created_at desc
  limit 1
  for update skip locked;

  -- If no personal available number, assign from unassigned stock
  if v_pool_id is null then
    select f.id, f.fir_number into v_pool_id, v_fir_number
    from public.fir_number_pool f
    where f.status = 'available' and f.societa_id = v_societa
      and f.user_id = v_zero and f.suspended = false
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

  -- Create the draft
  insert into public.fir_forms (user_id, tenant_id, status, numero_fir, form_data, allegati, deleted_by_user)
  values (p_user_id, v_tenant_id, 'bozza', v_fir_number, '{}'::jsonb, '[]'::jsonb, false)
  returning id into v_new_draft_id;

  -- *** CRITICAL FIX: Mark the pool entry as RESERVED immediately ***
  update public.fir_number_pool
  set status = 'reserved',
      reserved_by_fir_id = v_new_draft_id
  where id = v_pool_id;

  return v_new_draft_id;
end;
$function$;

-- Also fix auto_assign_after_consume to not re-check "available" numbers
-- that might be stale; just delegate entirely to ensure_user_has_fir_draft
CREATE OR REPLACE FUNCTION public.auto_assign_after_consume(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_remaining integer := 0;
  v_societa text;
  v_tenant_id uuid;
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_draft_id uuid;
begin
  select p.tenant_id into v_tenant_id from public.profiles p where p.user_id = p_user_id;
  if v_tenant_id is null then return '|0'; end if;
  v_societa := public.map_tenant_to_societa(v_tenant_id);

  -- Simply delegate to ensure_user_has_fir_draft which now handles everything correctly
  v_draft_id := public.ensure_user_has_fir_draft(p_user_id);

  select count(*) into v_remaining from public.fir_number_pool f
  where f.status='available' and f.societa_id=v_societa and f.user_id=v_zero and f.suspended=false;
  
  if v_remaining = 0 then 
    perform public.notify_fir_pool_empty(v_tenant_id, v_societa, p_user_id); 
  end if;

  -- Return the new FIR number and remaining count
  return coalesce(
    (select ff.numero_fir from public.fir_forms ff where ff.id = v_draft_id), 
    ''
  ) || '|' || v_remaining::text;
end;
$function$;

-- BACKFIX: Fix any remaining available pool entries that are tied to active drafts
UPDATE public.fir_number_pool fp
SET status = 'reserved',
    reserved_by_fir_id = sub.draft_id
FROM (
  SELECT DISTINCT ON (ff.numero_fir) fp2.id as pool_id, ff.id as draft_id
  FROM public.fir_number_pool fp2
  JOIN public.fir_forms ff ON ff.numero_fir = fp2.fir_number
    AND ff.status = 'bozza'
    AND coalesce(ff.deleted_by_user, false) = false
  WHERE fp2.status = 'available'
  ORDER BY ff.numero_fir, ff.created_at DESC
) sub
WHERE fp.id = sub.pool_id;
