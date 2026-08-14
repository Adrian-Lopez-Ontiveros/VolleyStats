-- Lectura pública para espectadores (anon) + lookup de registro.
-- Ejecutar en Supabase → SQL Editor si los invitados no ven plantilla/partidos
-- o si el registro no encuentra jugadores que sí existen.

-- ---------- Permisos de tabla ----------
grant usage on schema public to anon, authenticated;

grant select on table public.teams to anon, authenticated;
grant select on table public.players to anon, authenticated;
grant select on table public.matches to anon, authenticated;
grant select on table public.match_events to anon, authenticated;
grant select on table public.profiles to authenticated;

-- ---------- RLS: lectura para anon + authenticated; escritura solo admin ----------
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;

drop policy if exists "teams_select_auth" on public.teams;
drop policy if exists "teams_select_public" on public.teams;
create policy "teams_select_public"
on public.teams for select
to anon, authenticated
using (true);

drop policy if exists "players_select_auth" on public.players;
drop policy if exists "players_select_public" on public.players;
create policy "players_select_public"
on public.players for select
to anon, authenticated
using (true);

drop policy if exists "matches_select_auth" on public.matches;
drop policy if exists "matches_select_public" on public.matches;
create policy "matches_select_public"
on public.matches for select
to anon, authenticated
using (true);

drop policy if exists "events_select_auth" on public.match_events;
drop policy if exists "events_select_public" on public.match_events;
create policy "events_select_public"
on public.match_events for select
to anon, authenticated
using (true);

-- ---------- Comparación flexible de nombres ----------
create or replace function public.normalize_person_name(input text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  select lower(
    trim(
      regexp_replace(
        regexp_replace(
          translate(
            coalesce(input, ''),
            'ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛáàäâéèëêíìïîóòöôúùüûÑñÇç',
            'AAAAEEEEIIIIOOOOUUUUaaaaeeeeiiiioooouuuunncc'
          ),
          '[[:punct:]]', '', 'g'
        ),
        '[[:space:]]+', ' ', 'g'
      )
    )
  );
$$;

create or replace function public.person_names_match(a text, b text)
returns boolean
language plpgsql
immutable
parallel safe
set search_path = public
as $$
declare
  na text := public.normalize_person_name(a);
  nb text := public.normalize_person_name(b);
  ta text[];
  tb text[];
  shorter text[];
  longer text[];
begin
  if na = '' or nb = '' then
    return false;
  end if;
  if na = nb then
    return true;
  end if;

  ta := regexp_split_to_array(na, ' ');
  tb := regexp_split_to_array(nb, ' ');

  if cardinality(ta) = cardinality(tb)
     and (select count(*) from unnest(ta) t where t = any(tb)) = cardinality(ta) then
    return true;
  end if;

  if cardinality(ta) <= cardinality(tb) then
    shorter := ta;
    longer := tb;
  else
    shorter := tb;
    longer := ta;
  end if;

  if cardinality(shorter) >= 2
     and (select count(*) from unnest(shorter) t where t = any(longer)) = cardinality(shorter) then
    return true;
  end if;

  return false;
end;
$$;

-- Bypass RLS para el registro: el usuario aún no está autenticado.
create or replace function public.list_roster_for_signup()
returns table (id uuid, full_name text, user_id uuid, team_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.user_id, p.team_id
  from public.players p;
$$;

revoke all on function public.normalize_person_name(text) from public;
revoke all on function public.person_names_match(text, text) from public;
revoke all on function public.list_roster_for_signup() from public;
grant execute on function public.normalize_person_name(text) to anon, authenticated;
grant execute on function public.person_names_match(text, text) to anon, authenticated;
grant execute on function public.list_roster_for_signup() to anon, authenticated;

-- Fallback: si el alta no manda player_id, intenta vincular por nombre.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_count int;
  new_role public.user_role;
  meta_name text;
  meta_player uuid;
  linked_team uuid;
  linked_name text;
  meta_avatar text;
  name_matches int;
begin
  select count(*) into admin_count from public.profiles where role = 'admin';
  new_role := case when admin_count = 0 then 'admin' else 'player' end;

  meta_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  begin
    meta_player := nullif(new.raw_user_meta_data->>'player_id', '')::uuid;
  exception when others then
    meta_player := null;
  end;

  meta_avatar := nullif(new.raw_user_meta_data->>'avatar_url', '');
  linked_team := null;
  linked_name := meta_name;

  if meta_player is not null then
    select team_id, full_name into linked_team, linked_name
    from public.players
    where id = meta_player
      and user_id is null;
  elsif admin_count > 0 then
    select count(*) into name_matches
    from public.players p
    where p.user_id is null
      and public.person_names_match(p.full_name, meta_name);

    if name_matches = 1 then
      select p.id, p.team_id, p.full_name
      into meta_player, linked_team, linked_name
      from public.players p
      where p.user_id is null
        and public.person_names_match(p.full_name, meta_name);
    end if;
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, role, team_id)
  values (
    new.id,
    new.email,
    coalesce(linked_name, meta_name),
    meta_avatar,
    new_role,
    linked_team
  );

  if meta_player is not null then
    update public.players
    set user_id = new.id
    where id = meta_player
      and user_id is null;
  end if;

  return new;
end;
$$;
