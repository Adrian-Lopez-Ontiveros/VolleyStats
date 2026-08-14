-- FuenlaStats: 3 ligas del club, registro vinculado a plantilla, lectura para espectadores.
-- Ejecutar en Supabase → SQL Editor si el proyecto ya tenía 001_init / schema.sql anterior.

do $$ begin
  create type public.team_category as enum (
    'cadete_femenino', 'senior_masculino', 'senior_femenino'
  );
exception when duplicate_object then null;
end $$;

alter table public.teams add column if not exists category text;
alter table public.teams add column if not exists is_club_team boolean not null default false;

create index if not exists idx_teams_category on public.teams (category);
drop index if exists idx_teams_one_club_per_category;
create unique index if not exists idx_teams_one_club_per_category
  on public.teams (category)
  where is_club_team and category is not null;

create or replace function public.has_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where role = 'admin'
  );
$$;

grant execute on function public.has_admin() to anon, authenticated;

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
  elsif admin_count > 0 and to_regprocedure('public.person_names_match(text,text)') is not null then
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

-- No se crean equipos automáticamente si ya hay datos.
-- Desde Equipos, un admin crea las 3 plantillas del club (una por categoría).
-- Desde Liga, un admin añade los rivales de cada clasificación.
