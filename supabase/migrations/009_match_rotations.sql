-- Rotación (1-6) de cada equipo en el momento de la acción.

alter table public.match_events
  add column if not exists home_rotation int
    check (home_rotation is null or (home_rotation >= 1 and home_rotation <= 6));

alter table public.match_events
  add column if not exists away_rotation int
    check (away_rotation is null or (away_rotation >= 1 and away_rotation <= 6));

create index if not exists idx_match_events_rotations
  on public.match_events (match_id, home_rotation, away_rotation);
