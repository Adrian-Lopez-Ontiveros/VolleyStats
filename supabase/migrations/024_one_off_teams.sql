-- Rivales puntuales de un partido: no entran en la clasificación de liga.

alter table public.teams
  add column if not exists is_one_off boolean not null default false;

create index if not exists idx_teams_one_off on public.teams (is_one_off)
  where is_one_off;
