alter table public.teams
  add column if not exists federation_team_id text;

alter table public.matches
  add column if not exists is_federation boolean not null default false;

alter table public.matches
  add column if not exists federation_match_id text;

alter table public.matches
  add column if not exists federation_round text;

create unique index if not exists idx_teams_federation_team
  on public.teams (federation_team_id)
  where federation_team_id is not null;

create unique index if not exists idx_matches_federation_match
  on public.matches (federation_match_id)
  where federation_match_id is not null;
