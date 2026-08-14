-- Align teams.is_club_team with the live schema.
-- Safe to re-run: renames is_club if present, then ensures the remaining columns exist.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'teams'
      and column_name = 'is_club'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'teams'
      and column_name = 'is_club_team'
  ) then
    alter table public.teams rename column is_club to is_club_team;
  end if;
end $$;

alter table public.teams add column if not exists category text;
alter table public.teams add column if not exists is_club_team boolean not null default false;
alter table public.teams add column if not exists short_name text;
alter table public.teams add column if not exists city text;
alter table public.teams add column if not exists logo_url text;

drop index if exists idx_teams_one_club_per_category;
create unique index if not exists idx_teams_one_club_per_category
  on public.teams (category)
  where is_club_team and category is not null;
