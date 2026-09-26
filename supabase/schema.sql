-- =============================================================================
-- FuenlaStats — esquema completo (PostgreSQL + Auth + Storage + RLS)
-- Pegar y ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------- Tipos ----------
do $$ begin
  create type public.user_role as enum ('player', 'coach', 'admin');
exception when duplicate_object then null;
end $$;

alter type public.user_role add value if not exists 'coach';

do $$ begin
  create type public.match_status as enum ('scheduled', 'live', 'finished', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.point_type as enum (
    'attack',
    'block',
    'ace',
    'error',
    'opponent_error',
    'other',
    'attack_error',
    'attack_continuation',
    'serve_error',
    'serve_in',
    'reception_good',
    'reception_medium',
    'reception_bad',
    'reception_error',
    'defense_good',
    'defense_medium',
    'defense_bad',
    'defense_error',
    'block_touch',
    'block_continuation',
    'block_error',
    'opponent_point',
    'blockout'
  );
exception when duplicate_object then null;
end $$;

alter type public.point_type add value if not exists 'reception_error';
alter type public.point_type add value if not exists 'defense_good';
alter type public.point_type add value if not exists 'defense_medium';
alter type public.point_type add value if not exists 'defense_bad';
alter type public.point_type add value if not exists 'defense_error';
alter type public.point_type add value if not exists 'block_touch';
alter type public.point_type add value if not exists 'block_continuation';
alter type public.point_type add value if not exists 'block_error';
alter type public.point_type add value if not exists 'opponent_point';
alter type public.point_type add value if not exists 'blockout';

do $$ begin
  create type public.player_position as enum (
    'opuesto', 'central', 'receptor', 'colocador', 'libero', 'universal'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.team_category as enum (
    'cadete_femenino', 'senior_masculino', 'senior_femenino'
  );
exception when duplicate_object then null;
end $$;

-- ---------- Tablas ----------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  logo_url text,
  city text,
  category text,
  is_club_team boolean not null default false,
  is_one_off boolean not null default false,
  federation_team_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  avatar_url text,
  role public.user_role not null default 'player',
  team_id uuid references public.teams (id) on delete set null,
  coached_team_id uuid references public.teams (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  full_name text not null,
  jersey_number int check (jersey_number is null or (jersey_number >= 0 and jersey_number <= 99)),
  position public.player_position,
  avatar_url text,
  attack_points int not null default 0,
  block_points int not null default 0,
  aces int not null default 0,
  errors int not null default 0,
  opponent_errors int not null default 0,
  other_points int not null default 0,
  matches_played int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  home_team_id uuid not null references public.teams (id) on delete restrict,
  away_team_id uuid not null references public.teams (id) on delete restrict,
  scheduled_at timestamptz not null,
  location text,
  status public.match_status not null default 'scheduled',
  home_sets int not null default 0,
  away_sets int not null default 0,
  current_set int not null default 1,
  home_points int not null default 0,
  away_points int not null default 0,
  set_scores jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  is_federation boolean not null default false,
  reminder_sent_at timestamptz,
  federation_match_id text,
  federation_round text,
  sets_to_win int not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_different_teams check (home_team_id <> away_team_id),
  constraint matches_sets_to_win_check check (sets_to_win in (2, 3))
);

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  set_number int not null,
  player_id uuid references public.players (id) on delete set null,
  acting_team_id uuid not null references public.teams (id) on delete restrict,
  scoring_team_id uuid references public.teams (id) on delete restrict,
  serving_team_id uuid references public.teams (id) on delete restrict,
  home_rotation int check (home_rotation is null or (home_rotation >= 1 and home_rotation <= 6)),
  away_rotation int check (away_rotation is null or (away_rotation >= 1 and away_rotation <= 6)),
  point_type public.point_type not null,
  client_id text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.match_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  is_starter boolean not null default false,
  is_libero boolean not null default false,
  is_reception_libero boolean not null default false,
  is_defense_libero boolean not null default false,
  is_active_libero boolean not null default false,
  court_position int check (court_position is null or (court_position >= 1 and court_position <= 6)),
  created_at timestamptz not null default now(),
  constraint match_lineups_unique_player unique (match_id, player_id)
);

create table if not exists public.match_substitutions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  player_out_id uuid not null references public.players (id) on delete restrict,
  player_in_id uuid not null references public.players (id) on delete restrict,
  set_number int check (set_number is null or (set_number >= 1 and set_number <= 5)),
  occurred_at text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint match_substitutions_different_players check (player_out_id <> player_in_id)
);

-- ---------- Índices ----------
create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_team on public.profiles (team_id);
create index if not exists idx_profiles_coached_team on public.profiles (coached_team_id);
create index if not exists idx_players_team on public.players (team_id);
create index if not exists idx_players_user on public.players (user_id);
create index if not exists idx_teams_category on public.teams (category);
create unique index if not exists idx_teams_one_club_per_category
  on public.teams (category)
  where is_club_team and category is not null;
create index if not exists idx_matches_status on public.matches (status);
create index if not exists idx_matches_date on public.matches (scheduled_at desc);
create index if not exists idx_match_events_match on public.match_events (match_id, created_at);
create index if not exists idx_match_events_player on public.match_events (player_id);
create unique index if not exists idx_match_events_client_id
  on public.match_events (match_id, client_id)
  where client_id is not null;
create index if not exists idx_match_events_serving on public.match_events (match_id, serving_team_id);
create index if not exists idx_match_events_rotations
  on public.match_events (match_id, home_rotation, away_rotation);
create index if not exists idx_match_lineups_match on public.match_lineups (match_id);
create unique index if not exists idx_match_lineups_one_reception_libero
  on public.match_lineups (match_id, team_id)
  where is_reception_libero;
create unique index if not exists idx_match_lineups_one_defense_libero
  on public.match_lineups (match_id, team_id)
  where is_defense_libero;
create unique index if not exists idx_match_lineups_one_active_libero
  on public.match_lineups (match_id, team_id)
  where is_active_libero;
create unique index if not exists idx_match_lineups_unique_court_position
  on public.match_lineups (match_id, team_id, court_position)
  where court_position is not null;
create index if not exists idx_match_substitutions_match
  on public.match_substitutions (match_id, created_at);

create or replace function public.sync_match_lineup_libero()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_libero
     and not coalesce(new.is_reception_libero, false)
     and not coalesce(new.is_defense_libero, false) then
    new.is_reception_libero := true;
    new.is_defense_libero := true;
    if not coalesce(new.is_active_libero, false) then
      new.is_active_libero := true;
    end if;
  end if;

  new.is_libero := coalesce(new.is_reception_libero, false)
    or coalesce(new.is_defense_libero, false);

  if not new.is_libero then
    new.is_active_libero := false;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_match_lineup_libero on public.match_lineups;
create trigger trg_sync_match_lineup_libero
before insert or update on public.match_lineups
for each row execute function public.sync_match_lineup_libero();

-- ---------- updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_players_updated_at on public.players;
create trigger trg_players_updated_at
before update on public.players
for each row execute function public.set_updated_at();

drop trigger if exists trg_matches_updated_at on public.matches;
create trigger trg_matches_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

-- ---------- Helpers de roles ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

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

-- ---------- Alta de usuario: perfil + vínculo con jugador existente ----------
-- El primer usuario registrado se convierte automáticamente en admin.
-- El resto de jugadores deben coincidir con un registro creado por un admin.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- Recalcular estadísticas de un jugador ----------
create or replace function public.recompute_player_stats(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.players p
  set
    attack_points = coalesce(s.attack_points, 0),
    block_points = coalesce(s.block_points, 0),
    aces = coalesce(s.aces, 0),
    errors = coalesce(s.errors, 0),
    opponent_errors = coalesce(s.opponent_errors, 0),
    other_points = coalesce(s.other_points, 0),
    matches_played = coalesce(s.matches_played, 0)
  from (
    select
      e.player_id,
      count(*) filter (where e.point_type = 'attack') as attack_points,
      count(*) filter (where e.point_type::text in ('block', 'blockout')) as block_points,
      count(*) filter (where e.point_type = 'ace') as aces,
      count(*) filter (
        where e.point_type::text in (
          'error',
          'attack_error',
          'serve_error',
          'reception_error',
          'defense_error',
          'block_error'
        )
      ) as errors,
      count(*) filter (where e.point_type = 'opponent_error') as opponent_errors,
      count(*) filter (where e.point_type = 'other') as other_points,
      count(distinct e.match_id) as matches_played
    from public.match_events e
    where e.player_id = p_player_id
    group by e.player_id
  ) s
  where p.id = p_player_id
    and p.id = s.player_id;

  -- Si no tiene eventos, poner a cero
  if not found then
    update public.players
    set
      attack_points = 0,
      block_points = 0,
      aces = 0,
      errors = 0,
      opponent_errors = 0,
      other_points = 0,
      matches_played = 0
    where id = p_player_id;
  end if;
end;
$$;

-- ---------- RLS ----------
grant usage on schema public to anon, authenticated;
grant select on table public.teams to anon, authenticated;
grant select on table public.players to anon, authenticated;
grant select on table public.matches to anon, authenticated;
grant select on table public.match_events to anon, authenticated;
grant select on table public.match_lineups to anon, authenticated;
grant select on table public.match_substitutions to anon, authenticated;
grant select on table public.profiles to authenticated;

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.match_lineups enable row level security;
alter table public.match_substitutions enable row level security;

-- Teams (lectura pública para el selector del registro)
drop policy if exists "teams_select_auth" on public.teams;
drop policy if exists "teams_select_public" on public.teams;
create policy "teams_select_public"
on public.teams for select
to anon, authenticated
using (true);

drop policy if exists "teams_write_admin" on public.teams;
drop policy if exists "teams_write_staff" on public.teams;
create policy "teams_write_staff"
on public.teams for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

-- Profiles
drop policy if exists "profiles_select_auth" on public.profiles;
create policy "profiles_select_auth"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Players (lectura pública para espectadores y para vincular el registro)
drop policy if exists "players_select_auth" on public.players;
drop policy if exists "players_select_public" on public.players;
create policy "players_select_public"
on public.players for select
to anon, authenticated
using (true);

drop policy if exists "players_insert_admin" on public.players;
drop policy if exists "players_insert_staff" on public.players;
create policy "players_insert_staff"
on public.players for insert
to authenticated
with check (public.is_coach_or_admin());

drop policy if exists "players_update_admin" on public.players;
drop policy if exists "players_update_staff" on public.players;
create policy "players_update_staff"
on public.players for update
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

drop policy if exists "players_update_own_avatar" on public.players;
create policy "players_update_own_avatar"
on public.players for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "players_delete_admin" on public.players;
drop policy if exists "players_delete_staff" on public.players;
create policy "players_delete_staff"
on public.players for delete
to authenticated
using (public.is_coach_or_admin());

-- Matches
drop policy if exists "matches_select_auth" on public.matches;
drop policy if exists "matches_select_public" on public.matches;
create policy "matches_select_public"
on public.matches for select
to anon, authenticated
using (true);

drop policy if exists "matches_write_admin" on public.matches;
drop policy if exists "matches_write_staff" on public.matches;
create policy "matches_write_staff"
on public.matches for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

-- Match events
drop policy if exists "events_select_auth" on public.match_events;
drop policy if exists "events_select_public" on public.match_events;
create policy "events_select_public"
on public.match_events for select
to anon, authenticated
using (true);

drop policy if exists "events_write_admin" on public.match_events;
drop policy if exists "events_write_staff" on public.match_events;
create policy "events_write_staff"
on public.match_events for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

drop policy if exists "lineups_select_public" on public.match_lineups;
create policy "lineups_select_public"
on public.match_lineups for select
to anon, authenticated
using (true);

drop policy if exists "lineups_write_admin" on public.match_lineups;
drop policy if exists "lineups_write_staff" on public.match_lineups;
create policy "lineups_write_staff"
on public.match_lineups for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

drop policy if exists "substitutions_select_public" on public.match_substitutions;
create policy "substitutions_select_public"
on public.match_substitutions for select
to anon, authenticated
using (true);

drop policy if exists "substitutions_write_admin" on public.match_substitutions;
drop policy if exists "substitutions_write_staff" on public.match_substitutions;
create policy "substitutions_write_staff"
on public.match_substitutions for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

-- ---------- Storage: avatares ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "avatars_auth_insert" on storage.objects;
create policy "avatars_auth_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "avatars_auth_update" on storage.objects;
create policy "avatars_auth_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'avatars'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Impide que un jugador se auto-promocione o edite campos protegidos
create or replace function public.protect_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  new.role := old.role;
  new.email := old.email;
  new.full_name := old.full_name;
  new.coached_team_id := old.coached_team_id;
  if old.team_id is not null then
    new.team_id := old.team_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_updates on public.profiles;
create trigger trg_protect_profile_updates
before update on public.profiles
for each row execute function public.protect_profile_updates();

create or replace function public.protect_player_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_coach_or_admin() then
    return new;
  end if;

  -- Permitir vincular una cuenta a un jugador aún sin user_id.
  if old.user_id is not null then
    new.user_id := old.user_id;
  end if;
  new.team_id := old.team_id;
  new.full_name := old.full_name;
  if old.user_id is distinct from auth.uid() then
    new.jersey_number := old.jersey_number;
  end if;
  new.position := old.position;
  new.attack_points := old.attack_points;
  new.block_points := old.block_points;
  new.aces := old.aces;
  new.errors := old.errors;
  new.opponent_errors := old.opponent_errors;
  new.other_points := old.other_points;
  new.matches_played := old.matches_played;
  return new;
end;
$$;

drop trigger if exists trg_protect_player_updates on public.players;
create trigger trg_protect_player_updates
before update on public.players
for each row execute function public.protect_player_updates();

create or replace function public.link_profile_to_matching_player()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pname text;
  pteam uuid;
  already uuid;
  chosen uuid;
begin
  if uid is null then
    return null;
  end if;

  select pr.full_name, pr.team_id
  into pname, pteam
  from public.profiles pr
  where pr.id = uid;

  if pname is null then
    return null;
  end if;

  select p.id into already
  from public.players p
  where p.user_id = uid
  limit 1;

  if already is not null then
    return already;
  end if;

  select p.id into chosen
  from public.players p
  where p.user_id is null
    and public.person_names_match(p.full_name, pname)
  order by
    case when pteam is not null and p.team_id = pteam then 0 else 1 end,
    p.jersey_number nulls last,
    p.created_at
  limit 1;

  if chosen is null then
    return null;
  end if;

  update public.players
  set user_id = uid
  where id = chosen
    and user_id is null;

  update public.profiles pr
  set team_id = coalesce(pr.team_id, (select p.team_id from public.players p where p.id = chosen))
  where pr.id = uid;

  return chosen;
end;
$$;

revoke all on function public.link_profile_to_matching_player() from public;
grant execute on function public.link_profile_to_matching_player() to authenticated;

drop policy if exists "avatars_auth_delete" on storage.objects;
create policy "avatars_auth_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- ---------- Realtime (opcional) ----------
alter table public.matches replica identity full;
alter table public.match_events replica identity full;

-- En Dashboard → Database → Publications → supabase_realtime
-- añade las tablas matches y match_events si quieres marcador en vivo multi-dispositivo.

-- ---------- Promover un admin manualmente (descomenta y cambia el email) ----------
-- update public.profiles set role = 'admin' where email = 'tu-email@dominio.com';

-- ---------- Columnas de liga (por si el esquema se re-ejecuta sobre una BD antigua) ----------
alter table public.teams add column if not exists category text;
alter table public.teams add column if not exists is_club_team boolean not null default false;
alter table public.teams add column if not exists is_one_off boolean not null default false;

-- ---------- Equipos del club (solo en instalaciones vacías) ----------
insert into public.teams (name, short_name, city, category, is_club_team)
select v.name, v.short_name, 'Fuenlabrada', v.category, true
from (
  values
    ('CV Fuenlabrada Cadete Femenino', 'CVF CF', 'cadete_femenino'),
    ('CV Fuenlabrada Senior Masculino', 'CVF SM', 'senior_masculino'),
    ('CV Fuenlabrada Senior Femenino', 'CVF SF', 'senior_femenino')
) as v(name, short_name, category)
where not exists (select 1 from public.teams)
  and not exists (
    select 1
    from public.teams t
    where t.is_club_team
      and t.category = v.category
  );

-- ---------- Entrenador: entrenamientos, pizarra y saltos ----------
create or replace function public.is_coach_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('coach', 'admin')
  );
$$;

grant execute on function public.is_coach_or_admin() to authenticated;

create table if not exists public.trainings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scheduled_at timestamptz not null,
  team_id uuid references public.teams (id) on delete set null,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_files (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_path text not null,
  mime_type text,
  file_size int,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.tactical_plays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  team_id uuid references public.teams (id) on delete set null,
  training_id uuid references public.trainings (id) on delete set null,
  board jsonb not null default '{"pieces":[]}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jump_analyses (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  training_id uuid references public.trainings (id) on delete set null,
  height_cm numeric(6, 1) not null check (height_cm >= 0 and height_cm <= 200),
  source text not null default 'manual' check (source in ('auto', 'manual')),
  video_url text,
  video_path text,
  takeoff_sec numeric(8, 3),
  landing_sec numeric(8, 3),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_trainings_date on public.trainings (scheduled_at desc);
create index if not exists idx_trainings_team on public.trainings (team_id);
create index if not exists idx_training_files_training on public.training_files (training_id);
create index if not exists idx_tactical_plays_updated on public.tactical_plays (updated_at desc);
create index if not exists idx_tactical_plays_training on public.tactical_plays (training_id);
create index if not exists idx_jump_analyses_player on public.jump_analyses (player_id, created_at desc);
create index if not exists idx_jump_analyses_training on public.jump_analyses (training_id);

drop trigger if exists trg_trainings_updated_at on public.trainings;
create trigger trg_trainings_updated_at
before update on public.trainings
for each row execute function public.set_updated_at();

drop trigger if exists trg_tactical_plays_updated_at on public.tactical_plays;
create trigger trg_tactical_plays_updated_at
before update on public.tactical_plays
for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.trainings to authenticated;
grant select, insert, update, delete on table public.training_files to authenticated;
grant select, insert, update, delete on table public.tactical_plays to authenticated;
grant select, insert, update, delete on table public.jump_analyses to authenticated;

alter table public.trainings enable row level security;
alter table public.training_files enable row level security;
alter table public.tactical_plays enable row level security;
alter table public.jump_analyses enable row level security;

drop policy if exists "trainings_select_staff" on public.trainings;
create policy "trainings_select_staff"
on public.trainings for select
to authenticated
using (public.is_coach_or_admin());

drop policy if exists "trainings_write_staff" on public.trainings;
create policy "trainings_write_staff"
on public.trainings for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

drop policy if exists "training_files_select_staff" on public.training_files;
create policy "training_files_select_staff"
on public.training_files for select
to authenticated
using (public.is_coach_or_admin());

drop policy if exists "training_files_write_staff" on public.training_files;
create policy "training_files_write_staff"
on public.training_files for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

drop policy if exists "tactical_plays_select_staff" on public.tactical_plays;
create policy "tactical_plays_select_staff"
on public.tactical_plays for select
to authenticated
using (public.is_coach_or_admin());

drop policy if exists "tactical_plays_write_staff" on public.tactical_plays;
create policy "tactical_plays_write_staff"
on public.tactical_plays for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

drop policy if exists "jump_analyses_select_staff" on public.jump_analyses;
create policy "jump_analyses_select_staff"
on public.jump_analyses for select
to authenticated
using (public.is_coach_or_admin());

drop policy if exists "jump_analyses_write_staff" on public.jump_analyses;
create policy "jump_analyses_write_staff"
on public.jump_analyses for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

insert into storage.buckets (id, name, public)
values ('coach-media', 'coach-media', true)
on conflict (id) do nothing;

drop policy if exists "coach_media_public_read" on storage.objects;
create policy "coach_media_public_read"
on storage.objects for select
using (bucket_id = 'coach-media');

drop policy if exists "coach_media_staff_insert" on storage.objects;
create policy "coach_media_staff_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'coach-media' and public.is_coach_or_admin());

drop policy if exists "coach_media_staff_update" on storage.objects;
create policy "coach_media_staff_update"
on storage.objects for update
to authenticated
using (bucket_id = 'coach-media' and public.is_coach_or_admin())
with check (bucket_id = 'coach-media' and public.is_coach_or_admin());

drop policy if exists "coach_media_staff_delete" on storage.objects;
create policy "coach_media_staff_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'coach-media' and public.is_coach_or_admin());

-- Cromos tipo FIFA
create or replace function public.owns_player(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.players
    where id = target_player_id
      and user_id = auth.uid()
  );
$$;

grant execute on function public.owns_player(uuid) to authenticated;

create table if not exists public.player_cards (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null unique references public.players (id) on delete cascade,
  photo_url text,
  photo_focus_x numeric(5, 2) not null default 50 check (photo_focus_x >= 0 and photo_focus_x <= 100),
  photo_focus_y numeric(5, 2) not null default 18 check (photo_focus_y >= 0 and photo_focus_y <= 100),
  photo_zoom numeric(4, 2) not null default 1 check (photo_zoom >= 1 and photo_zoom <= 2.5),
  name_mode text not null default 'last' check (name_mode in ('last', 'full', 'custom')),
  display_name text,
  position public.player_position,
  jump int not null default 50 check (jump between 1 and 99),
  attack int not null default 50 check (attack between 1 and 99),
  block int not null default 50 check (block between 1 and 99),
  serve int not null default 50 check (serve between 1 and 99),
  reception int not null default 50 check (reception between 1 and 99),
  defense int not null default 50 check (defense between 1 and 99),
  rating_override int check (rating_override is null or rating_override between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_player_cards_player on public.player_cards (player_id);

drop trigger if exists trg_player_cards_updated_at on public.player_cards;
create trigger trg_player_cards_updated_at
before update on public.player_cards
for each row execute function public.set_updated_at();

grant select on table public.player_cards to anon, authenticated;
grant select, insert, update, delete on table public.player_cards to authenticated;

alter table public.player_cards enable row level security;

drop policy if exists "player_cards_select_public" on public.player_cards;
create policy "player_cards_select_public"
on public.player_cards for select
to anon, authenticated
using (true);

drop policy if exists "player_cards_insert_own" on public.player_cards;
create policy "player_cards_insert_own"
on public.player_cards for insert
to authenticated
with check (public.is_admin() or public.owns_player(player_id));

drop policy if exists "player_cards_update_own" on public.player_cards;
create policy "player_cards_update_own"
on public.player_cards for update
to authenticated
using (public.is_admin() or public.owns_player(player_id))
with check (public.is_admin() or public.owns_player(player_id));

drop policy if exists "player_cards_delete_own" on public.player_cards;
create policy "player_cards_delete_own"
on public.player_cards for delete
to authenticated
using (public.is_admin() or public.owns_player(player_id));

-- Noticias del club
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  cover_url text,
  cover_path text,
  cover_focus_x numeric(5, 2) not null default 50 check (cover_focus_x >= 0 and cover_focus_x <= 100),
  cover_focus_y numeric(5, 2) not null default 50 check (cover_focus_y >= 0 and cover_focus_y <= 100),
  cover_zoom numeric(4, 2) not null default 1 check (cover_zoom >= 0.4 and cover_zoom <= 2.5),
  published_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_news_published on public.news (published_at desc);

drop trigger if exists trg_news_updated_at on public.news;
create trigger trg_news_updated_at
before update on public.news
for each row execute function public.set_updated_at();

grant select on table public.news to anon, authenticated;
grant select, insert, update, delete on table public.news to authenticated;

alter table public.news enable row level security;

drop policy if exists "news_select_public" on public.news;
create policy "news_select_public"
on public.news for select
to anon, authenticated
using (true);

drop policy if exists "news_write_admin" on public.news;
drop policy if exists "news_write_staff" on public.news;
create policy "news_write_staff"
on public.news for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

insert into storage.buckets (id, name, public)
values ('news', 'news', true)
on conflict (id) do nothing;

drop policy if exists "news_public_read" on storage.objects;
create policy "news_public_read"
on storage.objects for select
using (bucket_id = 'news');

drop policy if exists "news_admin_insert" on storage.objects;
drop policy if exists "news_staff_insert" on storage.objects;
create policy "news_staff_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'news' and public.is_coach_or_admin());

drop policy if exists "news_admin_update" on storage.objects;
drop policy if exists "news_staff_update" on storage.objects;
create policy "news_staff_update"
on storage.objects for update
to authenticated
using (bucket_id = 'news' and public.is_coach_or_admin())
with check (bucket_id = 'news' and public.is_coach_or_admin());

drop policy if exists "news_admin_delete" on storage.objects;
drop policy if exists "news_staff_delete" on storage.objects;
create policy "news_staff_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'news' and public.is_coach_or_admin());

-- Racha, XP, niveles, recompensas y predicciones (migraci�n 022)

-- Racha diaria, XP, niveles, recompensas y predicciones de jornada.

create table if not exists public.user_progress (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  xp int not null default 0 check (xp >= 0),
  level int not null default 1 check (level >= 1),
  current_streak int not null default 0 check (current_streak >= 0),
  longest_streak int not null default 0 check (longest_streak >= 0),
  last_checkin_on date,
  equipped_title text,
  equipped_frame text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null,
  reason text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_rewards (
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, reward_id)
);

create table if not exists public.match_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  predicted_winner_id uuid not null references public.teams (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  is_correct boolean,
  xp_awarded int not null default 0,
  unique (user_id, match_id)
);

create index if not exists idx_xp_events_user on public.xp_events (user_id, created_at desc);
create index if not exists idx_user_rewards_user on public.user_rewards (user_id);
create index if not exists idx_match_predictions_match on public.match_predictions (match_id);
create index if not exists idx_match_predictions_user on public.match_predictions (user_id);
create index if not exists idx_match_predictions_unresolved
  on public.match_predictions (match_id)
  where resolved_at is null;

drop trigger if exists trg_user_progress_updated_at on public.user_progress;
create trigger trg_user_progress_updated_at
before update on public.user_progress
for each row execute function public.set_updated_at();

drop trigger if exists trg_match_predictions_updated_at on public.match_predictions;
create trigger trg_match_predictions_updated_at
before update on public.match_predictions
for each row execute function public.set_updated_at();

alter table public.user_progress enable row level security;
alter table public.xp_events enable row level security;
alter table public.user_rewards enable row level security;
alter table public.match_predictions enable row level security;

grant select on table public.user_progress to authenticated;
grant select on table public.xp_events to authenticated;
grant select on table public.user_rewards to authenticated;
grant select on table public.match_predictions to authenticated;

drop policy if exists "user_progress_select" on public.user_progress;
create policy "user_progress_select"
on public.user_progress for select
to authenticated
using (true);

drop policy if exists "xp_events_select_own" on public.xp_events;
create policy "xp_events_select_own"
on public.xp_events for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_rewards_select" on public.user_rewards;
create policy "user_rewards_select"
on public.user_rewards for select
to authenticated
using (true);

drop policy if exists "match_predictions_select" on public.match_predictions;
create policy "match_predictions_select"
on public.match_predictions for select
to authenticated
using (true);

create or replace function public.game_init_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_profiles_game_progress on public.profiles;
create trigger trg_profiles_game_progress
after insert on public.profiles
for each row execute function public.game_init_progress();

insert into public.user_progress (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.game_jornada_key(p_scheduled timestamptz)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  select to_char((p_scheduled at time zone 'Europe/Madrid'), 'IYYY-"W"IW');
$$;

create or replace function public.game_level_from_xp(p_xp int)
returns int
language plpgsql
immutable
parallel safe
set search_path = public
as $$
declare
  lvl int := 1;
  remaining int := greatest(coalesce(p_xp, 0), 0);
  need int;
begin
  loop
    need := 100 + (lvl - 1) * 25;
    exit when remaining < need or lvl >= 99;
    remaining := remaining - need;
    lvl := lvl + 1;
  end loop;
  return lvl;
end;
$$;

create or replace function public.game_unlock_rewards(p_user_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  prog public.user_progress%rowtype;
  hits int := 0;
  picks int := 0;
  perfects int := 0;
  newly text[] := '{}';
  rid text;
begin
  select * into prog from public.user_progress where user_id = p_user_id;
  if not found then
    return newly;
  end if;

  select count(*) filter (where is_correct), count(*)
  into hits, picks
  from public.match_predictions
  where user_id = p_user_id;

  select count(*) into perfects
  from public.xp_events
  where user_id = p_user_id
    and reason = 'jornada_perfect';

  for rid in
    select x.reward_id
    from (
      select 'badge_checkin' as reward_id where prog.current_streak >= 1 or prog.last_checkin_on is not null
      union all select 'title_novato' where prog.last_checkin_on is not null or prog.xp > 0
      union all select 'title_aficionado' where prog.level >= 2
      union all select 'title_socio' where prog.level >= 3
      union all select 'frame_naranja' where prog.level >= 4
      union all select 'title_hincha' where prog.level >= 5
      union all select 'badge_level5' where prog.level >= 5
      union all select 'frame_violeta' where prog.level >= 7
      union all select 'title_veterano' where prog.level >= 8
      union all select 'title_leyenda' where prog.level >= 10
      union all select 'badge_level10' where prog.level >= 10
      union all select 'frame_oro' where prog.level >= 12
      union all select 'title_corazon' where prog.level >= 15
      union all select 'title_racha' where prog.current_streak >= 7 or prog.longest_streak >= 7
      union all select 'badge_week' where prog.current_streak >= 7 or prog.longest_streak >= 7
      union all select 'badge_month' where prog.current_streak >= 30 or prog.longest_streak >= 30
      union all select 'title_imparable' where prog.current_streak >= 30 or prog.longest_streak >= 30
      union all select 'badge_first_pick' where picks >= 1
      union all select 'title_profeta' where hits >= 10
      union all select 'badge_oracle' where hits >= 25
      union all select 'title_oraculo' where perfects >= 1
      union all select 'badge_perfect' where perfects >= 1
    ) x
  loop
    insert into public.user_rewards (user_id, reward_id)
    values (p_user_id, rid)
    on conflict do nothing;
    if found then
      newly := array_append(newly, rid);
    end if;
  end loop;

  if prog.equipped_title is null then
    update public.user_progress
    set equipped_title = case
      when exists (select 1 from public.user_rewards where user_id = p_user_id and reward_id = 'title_novato')
      then 'title_novato'
      else equipped_title
    end
    where user_id = p_user_id
      and equipped_title is null;
  end if;

  return newly;
end;
$$;

create or replace function public.game_add_xp(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_meta jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  old_level int;
  new_xp int;
  new_level int;
  unlocked text[];
begin
  if p_amount is null or p_amount <= 0 then
    select xp, level into new_xp, new_level
    from public.user_progress
    where user_id = p_user_id;
    return jsonb_build_object(
      'xp', coalesce(new_xp, 0),
      'level', coalesce(new_level, 1),
      'leveled_up', false,
      'unlocked', '[]'::jsonb
    );
  end if;

  insert into public.user_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select level into old_level
  from public.user_progress
  where user_id = p_user_id
  for update;

  update public.user_progress
  set xp = xp + p_amount
  where user_id = p_user_id
  returning xp into new_xp;

  new_level := public.game_level_from_xp(new_xp);

  update public.user_progress
  set level = new_level
  where user_id = p_user_id
    and level <> new_level;

  insert into public.xp_events (user_id, amount, reason, meta)
  values (p_user_id, p_amount, p_reason, coalesce(p_meta, '{}'::jsonb));

  unlocked := public.game_unlock_rewards(p_user_id);

  return jsonb_build_object(
    'xp', new_xp,
    'level', new_level,
    'leveled_up', new_level > old_level,
    'unlocked', to_jsonb(coalesce(unlocked, '{}'))
  );
end;
$$;

create or replace function public.game_claim_daily_checkin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (timezone('Europe/Madrid', now()))::date;
  yesterday date := today - 1;
  prog public.user_progress%rowtype;
  new_streak int;
  gained int := 0;
  xp_result jsonb;
  unlocked text[] := '{}';
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.user_progress (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  select * into prog
  from public.user_progress
  where user_id = uid
  for update;

  if prog.last_checkin_on = today then
    return jsonb_build_object(
      'claimed', false,
      'already', true,
      'xp_gained', 0,
      'xp', prog.xp,
      'level', prog.level,
      'streak', prog.current_streak,
      'longest', prog.longest_streak,
      'leveled_up', false,
      'unlocked', '[]'::jsonb,
      'equipped_title', prog.equipped_title,
      'equipped_frame', prog.equipped_frame
    );
  end if;

  if prog.last_checkin_on = yesterday then
    new_streak := prog.current_streak + 1;
  else
    new_streak := 1;
  end if;

  gained := 10 + least(new_streak, 30) * 5;
  if new_streak = 7 then gained := gained + 40; end if;
  if new_streak = 14 then gained := gained + 80; end if;
  if new_streak = 30 then gained := gained + 150; end if;

  update public.user_progress
  set
    current_streak = new_streak,
    longest_streak = greatest(longest_streak, new_streak),
    last_checkin_on = today
  where user_id = uid;

  xp_result := public.game_add_xp(
    uid,
    gained,
    'checkin',
    jsonb_build_object('streak', new_streak)
  );

  select coalesce(array_agg(value), '{}')
  into unlocked
  from jsonb_array_elements_text(coalesce(xp_result->'unlocked', '[]'::jsonb)) as value;

  select * into prog from public.user_progress where user_id = uid;

  return jsonb_build_object(
    'claimed', true,
    'already', false,
    'xp_gained', gained,
    'xp', prog.xp,
    'level', prog.level,
    'streak', prog.current_streak,
    'longest', prog.longest_streak,
    'leveled_up', coalesce((xp_result->>'leveled_up')::boolean, false),
    'unlocked', to_jsonb(unlocked),
    'equipped_title', prog.equipped_title,
    'equipped_frame', prog.equipped_frame
  );
end;
$$;

create or replace function public.game_save_prediction(p_match_id uuid, p_winner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  match_row public.matches%rowtype;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into match_row from public.matches where id = p_match_id;
  if not found then
    raise exception 'Partido no encontrado';
  end if;
  if match_row.status <> 'scheduled' then
    raise exception 'Las predicciones se cierran cuando el partido empieza';
  end if;
  if p_winner_id is distinct from match_row.home_team_id
     and p_winner_id is distinct from match_row.away_team_id then
    raise exception 'Elige el equipo local o el visitante';
  end if;

  insert into public.user_progress (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  insert into public.match_predictions (user_id, match_id, predicted_winner_id)
  values (uid, p_match_id, p_winner_id)
  on conflict (user_id, match_id) do update
    set predicted_winner_id = excluded.predicted_winner_id
    where public.match_predictions.resolved_at is null;

  if not found then
    raise exception 'Esta predicción ya está cerrada';
  end if;

  perform public.game_unlock_rewards(uid);

  return jsonb_build_object('ok', true, 'match_id', p_match_id, 'winner_id', p_winner_id);
end;
$$;

create or replace function public.game_maybe_jornada_bonus(p_user_id uuid, p_jornada text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_matches int;
  user_picks int;
  correct_picks int;
  unresolved int;
begin
  if p_jornada is null or p_jornada = '' then
    return;
  end if;

  if exists (
    select 1 from public.xp_events
    where user_id = p_user_id
      and reason = 'jornada_perfect'
      and meta->>'jornada' = p_jornada
  ) then
    return;
  end if;

  select count(*) into total_matches
  from public.matches m
  where public.game_jornada_key(m.scheduled_at) = p_jornada
    and m.status <> 'cancelled'
    and (
      exists (select 1 from public.teams t where t.id = m.home_team_id and t.is_club_team)
      or exists (select 1 from public.teams t where t.id = m.away_team_id and t.is_club_team)
    );

  if total_matches < 2 then
    return;
  end if;

  select
    count(*),
    count(*) filter (where p.is_correct),
    count(*) filter (where p.resolved_at is null)
  into user_picks, correct_picks, unresolved
  from public.match_predictions p
  join public.matches m on m.id = p.match_id
  where p.user_id = p_user_id
    and public.game_jornada_key(m.scheduled_at) = p_jornada
    and m.status <> 'cancelled'
    and (
      exists (select 1 from public.teams t where t.id = m.home_team_id and t.is_club_team)
      or exists (select 1 from public.teams t where t.id = m.away_team_id and t.is_club_team)
    );

  if user_picks = total_matches and unresolved = 0 and correct_picks = total_matches then
    perform public.game_add_xp(
      p_user_id,
      50,
      'jornada_perfect',
      jsonb_build_object('jornada', p_jornada, 'hits', correct_picks)
    );
  end if;
end;
$$;

create or replace function public.game_resolve_match_predictions(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  match_row public.matches%rowtype;
  winner uuid;
  pred record;
  awarded int := 0;
  jornada text;
begin
  select * into match_row from public.matches where id = p_match_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  jornada := public.game_jornada_key(match_row.scheduled_at);

  if match_row.status = 'cancelled' then
    update public.match_predictions
    set resolved_at = now(), is_correct = null, xp_awarded = 0
    where match_id = p_match_id
      and resolved_at is null;
    return jsonb_build_object('ok', true, 'voided', true);
  end if;

  if match_row.status <> 'finished' then
    return jsonb_build_object('ok', false, 'reason', 'not_finished');
  end if;

  if match_row.home_sets = match_row.away_sets then
    return jsonb_build_object('ok', false, 'reason', 'no_winner');
  end if;

  winner := case
    when match_row.home_sets > match_row.away_sets then match_row.home_team_id
    else match_row.away_team_id
  end;

  for pred in
    select * from public.match_predictions
    where match_id = p_match_id
      and resolved_at is null
    for update
  loop
    if pred.predicted_winner_id = winner then
      update public.match_predictions
      set resolved_at = now(), is_correct = true, xp_awarded = 25
      where id = pred.id;
      perform public.game_add_xp(
        pred.user_id,
        25,
        'prediction',
        jsonb_build_object('match_id', p_match_id)
      );
      awarded := awarded + 1;
    else
      update public.match_predictions
      set resolved_at = now(), is_correct = false, xp_awarded = 0
      where id = pred.id;
    end if;
    perform public.game_unlock_rewards(pred.user_id);
    perform public.game_maybe_jornada_bonus(pred.user_id, jornada);
  end loop;

  return jsonb_build_object('ok', true, 'awarded', awarded);
end;
$$;

create or replace function public.game_resolve_pending()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  match_id uuid;
  n int := 0;
begin
  for match_id in
    select distinct p.match_id
    from public.match_predictions p
    join public.matches m on m.id = p.match_id
    where p.resolved_at is null
      and m.status in ('finished', 'cancelled')
  loop
    perform public.game_resolve_match_predictions(match_id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

create or replace function public.game_equip_reward(p_reward_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_reward_id is null or p_reward_id = '' then
    raise exception 'Recompensa no válida';
  end if;
  if not exists (
    select 1 from public.user_rewards
    where user_id = uid and reward_id = p_reward_id
  ) then
    raise exception 'Todavía no has desbloqueado esta recompensa';
  end if;

  if p_reward_id like 'title_%' then
    update public.user_progress set equipped_title = p_reward_id where user_id = uid;
  elsif p_reward_id like 'frame_%' then
    update public.user_progress set equipped_frame = p_reward_id where user_id = uid;
  else
    raise exception 'Esta recompensa no se puede equipar';
  end if;

  return jsonb_build_object('ok', true, 'reward_id', p_reward_id);
end;
$$;

revoke all on function public.game_add_xp(uuid, int, text, jsonb) from public, anon, authenticated;
revoke all on function public.game_unlock_rewards(uuid) from public, anon, authenticated;
revoke all on function public.game_maybe_jornada_bonus(uuid, text) from public, anon, authenticated;
revoke all on function public.game_init_progress() from public, anon, authenticated;

grant execute on function public.game_jornada_key(timestamptz) to authenticated;
grant execute on function public.game_level_from_xp(int) to authenticated;
grant execute on function public.game_claim_daily_checkin() to authenticated;
grant execute on function public.game_save_prediction(uuid, uuid) to authenticated;
grant execute on function public.game_resolve_match_predictions(uuid) to authenticated;
grant execute on function public.game_resolve_pending() to authenticated;
grant execute on function public.game_equip_reward(text) to authenticated;

-- Solo jornada m�s pr�xima (migraci�n 023)

-- Solo se puede predecir la jornada más próxima (la del siguiente partido del club).

create or replace function public.game_nearest_jornada_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.game_jornada_key(m.scheduled_at)
  from public.matches m
  where m.status in ('scheduled', 'live')
    and (
      exists (select 1 from public.teams t where t.id = m.home_team_id and t.is_club_team)
      or exists (select 1 from public.teams t where t.id = m.away_team_id and t.is_club_team)
    )
  order by m.scheduled_at
  limit 1;
$$;

create or replace function public.game_save_prediction(p_match_id uuid, p_winner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  match_row public.matches%rowtype;
  nearest text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into match_row from public.matches where id = p_match_id;
  if not found then
    raise exception 'Partido no encontrado';
  end if;
  if match_row.status <> 'scheduled' then
    raise exception 'Las predicciones se cierran cuando el partido empieza';
  end if;
  if p_winner_id is distinct from match_row.home_team_id
     and p_winner_id is distinct from match_row.away_team_id then
    raise exception 'Elige el equipo local o el visitante';
  end if;

  nearest := public.game_nearest_jornada_key();
  if nearest is null
     or public.game_jornada_key(match_row.scheduled_at) is distinct from nearest then
    raise exception 'Solo puedes predecir la jornada más próxima';
  end if;

  insert into public.user_progress (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  insert into public.match_predictions (user_id, match_id, predicted_winner_id)
  values (uid, p_match_id, p_winner_id)
  on conflict (user_id, match_id) do update
    set predicted_winner_id = excluded.predicted_winner_id
    where public.match_predictions.resolved_at is null;

  if not found then
    raise exception 'Esta predicción ya está cerrada';
  end if;

  perform public.game_unlock_rewards(uid);

  return jsonb_build_object('ok', true, 'match_id', p_match_id, 'winner_id', p_winner_id);
end;
$$;

grant execute on function public.game_nearest_jornada_key() to authenticated;
grant execute on function public.game_save_prediction(uuid, uuid) to authenticated;

create or replace function public.game_claim_jersey_xp()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  already int;
  result jsonb;
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  select count(*) into already
  from public.xp_events
  where user_id = uid
    and reason = 'jersey';

  if already > 0 then
    return jsonb_build_object(
      'claimed', false,
      'xp_gained', 0
    );
  end if;

  result := public.game_add_xp(uid, 20, 'jersey', '{}'::jsonb);

  return jsonb_build_object(
    'claimed', true,
    'xp_gained', 20,
    'xp', result->'xp',
    'level', result->'level',
    'leveled_up', result->'leveled_up',
    'unlocked', coalesce(result->'unlocked', '[]'::jsonb)
  );
end;
$$;

grant execute on function public.game_claim_jersey_xp() to authenticated;

-- Avisos el dia anterior (migracion 025)

-- Marca de aviso enviado el día anterior al partido.

alter table public.matches
  add column if not exists reminder_sent_at timestamptz;
