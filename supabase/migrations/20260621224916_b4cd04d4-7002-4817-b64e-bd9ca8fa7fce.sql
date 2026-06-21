CREATE OR REPLACE FUNCTION public.guard_and_reserve_fir_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_pool_id uuid;
  v_compact text;
begin
  if NEW.numero_fir is null or btrim(NEW.numero_fir) = '' then
    return NEW;
  end if;

  NEW.numero_fir := upper(regexp_replace(btrim(NEW.numero_fir), '\s+', ' ', 'g'));
  v_compact := upper(regexp_replace(NEW.numero_fir, '[^A-Z0-9]', '', 'g'));

  -- If it is an official RENTRI compact number, normalize it; otherwise keep the manual number.
  if not public.is_valid_fir_number(NEW.numero_fir) and v_compact ~ '^[A-Z]{5}[0-9]{6}[A-Z]{2}$' then
    NEW.numero_fir := substring(v_compact from 1 for 5) || ' ' || substring(v_compact from 6 for 6) || ' ' || substring(v_compact from 12 for 2);
  end if;

  if exists (
    select 1
    from public.fir_forms ff
    where ff.tenant_id = NEW.tenant_id
      and upper(regexp_replace(btrim(coalesce(ff.numero_fir, '')), '\s+', ' ', 'g')) = NEW.numero_fir
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

GRANT EXECUTE ON FUNCTION public.guard_and_reserve_fir_on_insert() TO authenticated;
GRANT EXECUTE ON FUNCTION public.guard_and_reserve_fir_on_insert() TO service_role;