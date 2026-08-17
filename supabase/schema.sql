-- =============================================================================
-- FuenlaStats — esquema completo (PostgreSQL + Auth + Storage + RLS)
-- Pegar y ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------- Tipos ----------
do $$ begin
  create type public.user_role as enum ('player', 'admin');
exception when duplicate_object then null;
end $$;

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
    'reception_bad'
  );
exception when duplicate_object then null;
end $$;

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
  federation_match_id text,
  federation_round text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_different_teams check (home_team_id <> away_team_id)
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
create index if not exists idx_match_events_serving on public.match_events (match_id, serving_team_id);
create index if not exists idx_match_events_rotations
  on public.match_events (match_id, home_rotation, away_rotation);
create index if not exists idx_match_lineups_match on public.match_lineups (match_id);
create unique index if not exists idx_match_lineups_one_libero
  on public.match_lineups (match_id, team_id)
  where is_libero;
create unique index if not exists idx_match_lineups_unique_court_position
  on public.match_lineups (match_id, team_id, court_position)
  where court_position is not null;
create index if not exists idx_match_substitutions_match
  on public.match_substitutions (match_id, created_at);

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
      count(*) filter (where e.point_type = 'block') as block_points,
      count(*) filter (where e.point_type = 'ace') as aces,
      count(*) filter (
        where e.point_type in ('error', 'attack_error', 'serve_error')
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
create policy "teams_write_admin"
on public.teams for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

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
create policy "players_insert_admin"
on public.players for insert
to authenticated
with check (public.is_admin());

drop policy if exists "players_update_admin" on public.players;
create policy "players_update_admin"
on public.players for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "players_update_own_avatar" on public.players;
create policy "players_update_own_avatar"
on public.players for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "players_delete_admin" on public.players;
create policy "players_delete_admin"
on public.players for delete
to authenticated
using (public.is_admin());

-- Matches
drop policy if exists "matches_select_auth" on public.matches;
drop policy if exists "matches_select_public" on public.matches;
create policy "matches_select_public"
on public.matches for select
to anon, authenticated
using (true);

drop policy if exists "matches_write_admin" on public.matches;
create policy "matches_write_admin"
on public.matches for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Match events
drop policy if exists "events_select_auth" on public.match_events;
drop policy if exists "events_select_public" on public.match_events;
create policy "events_select_public"
on public.match_events for select
to anon, authenticated
using (true);

drop policy if exists "events_write_admin" on public.match_events;
create policy "events_write_admin"
on public.match_events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "lineups_select_public" on public.match_lineups;
create policy "lineups_select_public"
on public.match_lineups for select
to anon, authenticated
using (true);

drop policy if exists "lineups_write_admin" on public.match_lineups;
create policy "lineups_write_admin"
on public.match_lineups for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "substitutions_select_public" on public.match_substitutions;
create policy "substitutions_select_public"
on public.match_substitutions for select
to anon, authenticated
using (true);

drop policy if exists "substitutions_write_admin" on public.match_substitutions;
create policy "substitutions_write_admin"
on public.match_substitutions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

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
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  -- Permitir vincular una cuenta a un jugador aún sin user_id.
  if old.user_id is not null then
    new.user_id := old.user_id;
  end if;
  new.team_id := old.team_id;
  new.full_name := old.full_name;
  new.jersey_number := old.jersey_number;
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
