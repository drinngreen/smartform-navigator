-- 1) Core function: ensure every user with available FIR has a draft form
create or replace function public.ensure_user_has_fir_draft(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_tenant_id uuid;
  v_societa text;
  v_existing_draft uuid;
  v_fir_number text;
  v_new_fir_id uuid;
  v_new_draft_id uuid;
begin
  if p_user_id is null then return null; end if;

  select p.tenant_id into v_tenant_id
  from public.profiles p where p.user_id = p_user_id;
  if v_tenant_id is null then return null; end if;

  -- Already has an active draft
  select ff.id into v_existing_draft
  from public.fir_forms ff
  where ff.user_id = p_user_id
    and ff.status = 'bozza'
    and coalesce(ff.deleted_by_user, false) = false
  order by ff.updated_at desc nulls last, ff.created_at desc
  limit 1;
  if v_existing_draft is not null then return v_existing_draft; end if;

  v_societa := public.map_tenant_to_societa(v_tenant_id);

  -- Try existing assigned available FIR
  select f.fir_number into v_fir_number
  from public.fir_number_pool f
  where f.user_id = p_user_id and f.status = 'available'
    and f.societa_id = v_societa and f.suspended = false
  order by f.assigned_at desc nulls last, f.created_at desc
  limit 1;

  -- If missing, assign from unassigned stock
  if v_fir_number is null then
    select f.id into v_new_fir_id
    from public.fir_number_pool f
    where f.status = 'available' and f.societa_id = v_societa
      and f.user_id = v_zero and f.suspended = false
    order by f.created_at asc, f.id asc
    limit 1 for update skip locked;

    if v_new_fir_id is not null then
      update public.fir_number_pool
      set user_id = p_user_id, assigned_at = now()
      where id = v_new_fir_id;

      select f.fir_number into v_fir_number
      from public.fir_number_pool f where f.id = v_new_fir_id;
    end if;
  end if;

  if v_fir_number is null then
    perform public.notify_fir_pool_empty(v_tenant_id, v_societa, p_user_id);
    return null;
  end if;

  insert into public.fir_forms (user_id, tenant_id, status, numero_fir, form_data, allegati, deleted_by_user)
  values (p_user_id, v_tenant_id, 'bozza', v_fir_number, '{}'::jsonb, '[]'::jsonb, false)
  returning id into v_new_draft_id;

  return v_new_draft_id;
end;
$$;

-- 2) Trigger on pool assignment to auto-create draft
create or replace function public.ensure_fir_draft_on_pool_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
begin
  if new.user_id is not null and new.user_id <> v_zero
     and new.status = 'available' and coalesce(new.suspended, false) = false then
    perform public.ensure_user_has_fir_draft(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ensure_fir_draft_on_pool_change on public.fir_number_pool;
create trigger trg_ensure_fir_draft_on_pool_change
after insert or update on public.fir_number_pool
for each row execute function public.ensure_fir_draft_on_pool_change();

-- 3) Update auto_assign_after_consume to also ensure draft
create or replace function public.auto_assign_after_consume(p_user_id uuid)
returns text language plpgsql security definer set search_path = 'public' as $function$
declare
  v_fir_id uuid; v_fir_number text := ''; v_remaining integer := 0;
  v_societa text; v_tenant_id uuid;
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
begin
  select p.tenant_id into v_tenant_id from public.profiles p where p.user_id = p_user_id;
  if v_tenant_id is null then return '|0'; end if;
  v_societa := public.map_tenant_to_societa(v_tenant_id);

  if exists (select 1 from public.fir_number_pool f
    where f.user_id = p_user_id and f.status = 'available'
      and f.societa_id = v_societa and f.suspended = false) then
    perform public.ensure_user_has_fir_draft(p_user_id);
    select count(*) into v_remaining from public.fir_number_pool f
    where f.status='available' and f.societa_id=v_societa and f.user_id=v_zero and f.suspended=false;
    return '|' || v_remaining::text;
  end if;

  select f.id, f.fir_number into v_fir_id, v_fir_number
  from public.fir_number_pool f
  where f.status='available' and f.societa_id=v_societa and f.user_id=v_zero and f.suspended=false
  order by f.created_at asc, f.id asc limit 1 for update skip locked;

  if v_fir_id is not null then
    update public.fir_number_pool set user_id=p_user_id, assigned_at=now() where id=v_fir_id;
  end if;

  perform public.ensure_user_has_fir_draft(p_user_id);

  select count(*) into v_remaining from public.fir_number_pool f
  where f.status='available' and f.societa_id=v_societa and f.user_id=v_zero and f.suspended=false;
  if v_remaining = 0 then perform public.notify_fir_pool_empty(v_tenant_id, v_societa, p_user_id); end if;

  return coalesce(v_fir_number, '') || '|' || v_remaining::text;
end;
$function$;

-- 4) Update generate_fir_numbers_for_user (returns void, keep same signature)
drop function if exists public.generate_fir_numbers_for_user(uuid);
create or replace function public.generate_fir_numbers_for_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = 'public' as $function$
begin
  if p_user_id is null then return; end if;
  perform public.auto_assign_after_consume(p_user_id);
  perform public.ensure_user_has_fir_draft(p_user_id);
exception when others then null;
end;
$function$;