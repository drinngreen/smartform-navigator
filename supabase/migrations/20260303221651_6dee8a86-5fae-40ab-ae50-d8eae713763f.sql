-- 1) Hard validation helper for FIR format
create or replace function public.is_valid_fir_number(p_value text)
returns boolean
language sql
immutable
as $$
  select p_value ~ '^[A-Z]{5} [0-9]{6} [A-Z]{2}$';
$$;

-- 2) Guard trigger: reject malformed FIR numbers on fir_forms inserts/updates
create or replace function public.guard_and_reserve_fir_on_insert()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_pool_id uuid;
begin
  if NEW.numero_fir is null or btrim(NEW.numero_fir) = '' then
    return NEW;
  end if;

  NEW.numero_fir := upper(regexp_replace(btrim(NEW.numero_fir), '\s+', ' ', 'g'));

  if not public.is_valid_fir_number(NEW.numero_fir) then
    raise exception 'Formato numero FIR non valido: %', NEW.numero_fir
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.fir_forms ff
    where ff.numero_fir = NEW.numero_fir
      and coalesce(ff.deleted_by_user, false) = false
      and ff.id <> NEW.id
  ) then
    raise exception 'Numero FIR già utilizzato: %', NEW.numero_fir
      using errcode = '23505';
  end if;

  select fp.id into v_pool_id
  from public.fir_number_pool fp
  where fp.fir_number = NEW.numero_fir
    and fp.status = 'available'
    and fp.suspended = false
    and (fp.user_id = NEW.user_id or fp.user_id = v_zero)
  order by (case when fp.user_id = NEW.user_id then 0 else 1 end), fp.created_at asc
  limit 1
  for update skip locked;

  if v_pool_id is not null then
    update public.fir_number_pool
    set status = 'reserved',
        user_id = NEW.user_id,
        assigned_at = coalesce(assigned_at, now())
    where id = v_pool_id;
  end if;

  return NEW;
end;
$function$;

-- 3) Ensure draft function: skip malformed pool numbers and self-heal malformed existing draft
create or replace function public.ensure_user_has_fir_draft(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_tenant_id uuid;
  v_societa text;
  v_existing_draft uuid;
  v_existing_num text;
  v_fir_number text;
  v_pool_id uuid;
  v_new_draft_id uuid;
begin
  if p_user_id is null then return null; end if;

  select p.tenant_id into v_tenant_id
  from public.profiles p where p.user_id = p_user_id;
  if v_tenant_id is null then return null; end if;

  select ff.id, ff.numero_fir into v_existing_draft, v_existing_num
  from public.fir_forms ff
  where ff.user_id = p_user_id
    and ff.status = 'bozza'
    and coalesce(ff.deleted_by_user, false) = false
  order by ff.updated_at desc nulls last, ff.created_at desc
  limit 1;

  if v_existing_draft is not null and public.is_valid_fir_number(v_existing_num) then
    return v_existing_draft;
  end if;

  v_societa := public.map_tenant_to_societa(v_tenant_id);

  select f.id, f.fir_number into v_pool_id, v_fir_number
  from public.fir_number_pool f
  where f.user_id = p_user_id
    and f.status = 'available'
    and f.societa_id = v_societa
    and f.suspended = false
    and public.is_valid_fir_number(f.fir_number)
    and not exists (
      select 1
      from public.fir_forms ff
      where ff.numero_fir = f.fir_number
        and coalesce(ff.deleted_by_user, false) = false
    )
  order by f.assigned_at desc nulls last, f.created_at desc
  limit 1
  for update skip locked;

  if v_pool_id is null then
    select f.id, f.fir_number into v_pool_id, v_fir_number
    from public.fir_number_pool f
    where f.status = 'available'
      and f.societa_id = v_societa
      and f.user_id = v_zero
      and f.suspended = false
      and public.is_valid_fir_number(f.fir_number)
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

  if v_existing_draft is not null then
    update public.fir_forms
    set numero_fir = v_fir_number,
        updated_at = now()
    where id = v_existing_draft
    returning id into v_new_draft_id;
  else
    insert into public.fir_forms (user_id, tenant_id, status, numero_fir, form_data, allegati, deleted_by_user)
    values (p_user_id, v_tenant_id, 'bozza', v_fir_number, '{}'::jsonb, '[]'::jsonb, false)
    returning id into v_new_draft_id;
  end if;

  update public.fir_number_pool
  set status = 'reserved',
      reserved_by_fir_id = v_new_draft_id
  where id = v_pool_id;

  return v_new_draft_id;
end;
$function$;

-- 4) Quarantine malformed pool rows so they can never be assigned
update public.fir_number_pool
set suspended = true,
    reserved_by_fir_id = null,
    status = case when status = 'reserved' then 'available' else status end
where not public.is_valid_fir_number(fir_number)
  and coalesce(consumed_at, null) is null;

-- 5) Immediate reconciliation: fix current malformed/null bozza by assigning next valid available number per societa
with malformed_drafts as (
  select
    ff.id as fir_id,
    ff.user_id,
    p.tenant_id,
    public.map_tenant_to_societa(p.tenant_id) as societa_id,
    row_number() over (
      partition by public.map_tenant_to_societa(p.tenant_id)
      order by ff.created_at asc, ff.id asc
    ) as rn
  from public.fir_forms ff
  join public.profiles p on p.user_id = ff.user_id
  where ff.status = 'bozza'
    and coalesce(ff.deleted_by_user, false) = false
    and (ff.numero_fir is null or not public.is_valid_fir_number(ff.numero_fir))
),
valid_available as (
  select
    fp.id as pool_id,
    fp.fir_number,
    fp.societa_id,
    row_number() over (
      partition by fp.societa_id
      order by fp.created_at asc, fp.id asc
    ) as rn
  from public.fir_number_pool fp
  where fp.status = 'available'
    and fp.suspended = false
    and public.is_valid_fir_number(fp.fir_number)
    and not exists (
      select 1 from public.fir_forms ff
      where ff.numero_fir = fp.fir_number
        and coalesce(ff.deleted_by_user, false) = false
    )
),
pairs as (
  select
    md.fir_id,
    md.user_id,
    va.pool_id,
    va.fir_number
  from malformed_drafts md
  join valid_available va
    on va.societa_id = md.societa_id
   and va.rn = md.rn
)
update public.fir_forms ff
set numero_fir = p.fir_number,
    updated_at = now()
from pairs p
where ff.id = p.fir_id;

with malformed_drafts as (
  select
    ff.id as fir_id,
    ff.user_id,
    p.tenant_id,
    public.map_tenant_to_societa(p.tenant_id) as societa_id,
    row_number() over (
      partition by public.map_tenant_to_societa(p.tenant_id)
      order by ff.created_at asc, ff.id asc
    ) as rn
  from public.fir_forms ff
  join public.profiles p on p.user_id = ff.user_id
  where ff.status = 'bozza'
    and coalesce(ff.deleted_by_user, false) = false
    and (ff.numero_fir is null or not public.is_valid_fir_number(ff.numero_fir))
),
valid_available as (
  select
    fp.id as pool_id,
    fp.fir_number,
    fp.societa_id,
    row_number() over (
      partition by fp.societa_id
      order by fp.created_at asc, fp.id asc
    ) as rn
  from public.fir_number_pool fp
  where fp.status = 'available'
    and fp.suspended = false
    and public.is_valid_fir_number(fp.fir_number)
    and not exists (
      select 1 from public.fir_forms ff
      where ff.numero_fir = fp.fir_number
        and coalesce(ff.deleted_by_user, false) = false
    )
),
pairs as (
  select
    md.fir_id,
    md.user_id,
    va.pool_id,
    va.fir_number
  from malformed_drafts md
  join valid_available va
    on va.societa_id = md.societa_id
   and va.rn = md.rn
)
update public.fir_number_pool fp
set status = 'reserved',
    user_id = p.user_id,
    assigned_at = coalesce(fp.assigned_at, now()),
    reserved_by_fir_id = p.fir_id
from pairs p
where fp.id = p.pool_id;