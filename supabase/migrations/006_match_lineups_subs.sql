-- Marcador manual (usa matches.set_scores) + alineación titular + sustituciones.
-- Ejecutar en Supabase → SQL Editor.

create table if not exists public.match_lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  is_starter boolean not null default false,
  is_libero boolean not null default false,
  created_at timestamptz not null default now(),
  constraint match_lineups_unique_player unique (match_id, player_id)
);

create index if not exists idx_match_lineups_match on public.match_lineups (match_id);
create unique index if not exists idx_match_lineups_one_libero
  on public.match_lineups (match_id, team_id)
  where is_libero;

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

create index if not exists idx_match_substitutions_match
  on public.match_substitutions (match_id, created_at);

alter table public.match_lineups enable row level security;
alter table public.match_substitutions enable row level security;

grant select on table public.match_lineups to anon, authenticated;
grant select on table public.match_substitutions to anon, authenticated;

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
