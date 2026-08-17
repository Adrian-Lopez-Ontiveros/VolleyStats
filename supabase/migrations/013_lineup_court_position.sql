-- Posición de pista (1-6) de cada titular. El líbero queda fuera (null).

alter table public.match_lineups
  add column if not exists court_position int
    check (court_position is null or (court_position >= 1 and court_position <= 6));

create unique index if not exists idx_match_lineups_unique_court_position
  on public.match_lineups (match_id, team_id, court_position)
  where court_position is not null;
