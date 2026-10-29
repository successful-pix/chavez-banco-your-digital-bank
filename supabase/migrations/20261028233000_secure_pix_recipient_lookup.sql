create schema if not exists private;

create table if not exists private.pix_recipient_lookup_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

revoke all on schema private from public, anon, authenticated;
revoke all on table private.pix_recipient_lookup_attempts from public, anon, authenticated;

create or replace function public.lookup_pix_recipient(lookup_type text, lookup_value text)
returns table(full_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_value text := btrim(coalesce(lookup_value, ''));
  v_count integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if lookup_type not in ('email', 'cpf') then raise exception 'Unsupported lookup type'; end if;
  if length(v_value) < 5 or length(v_value) > 254 then return; end if;

  delete from private.pix_recipient_lookup_attempts where attempted_at < now() - interval '1 hour';
  select count(*) into v_count from private.pix_recipient_lookup_attempts
    where user_id = v_user_id and attempted_at > now() - interval '1 minute';
  if v_count >= 10 then raise exception 'Too many recipient lookups. Try again shortly.'; end if;
  insert into private.pix_recipient_lookup_attempts(user_id) values (v_user_id);

  if lookup_type = 'email' then
    return query select p.full_name from public.profiles p
      where lower(p.email) = lower(v_value) and p.id <> v_user_id limit 1;
  else
    if length(regexp_replace(v_value, '[^0-9]', '', 'g')) <> 11 then return; end if;
    return query select p.full_name from public.profiles p
      where regexp_replace(coalesce(p.cpf, ''), '[^0-9]', '', 'g') = regexp_replace(v_value, '[^0-9]', '', 'g')
      and p.id <> v_user_id limit 1;
  end if;
end;
$$;

revoke execute on function public.lookup_pix_recipient(text, text) from public, anon;
grant execute on function public.lookup_pix_recipient(text, text) to authenticated;
