create or replace function public.is_valid_fir_number(p_value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_value ~ '^[A-Z]{5} [0-9]{6} [A-Z]{2}$';
$$;