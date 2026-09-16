-- El entrenador gestiona partidos, plantilla y noticias.
-- Puede jugar en un equipo y entrenar otro (coached_team_id).

alter table public.profiles
  add column if not exists coached_team_id uuid references public.teams (id) on delete set null;

create index if not exists idx_profiles_coached_team on public.profiles (coached_team_id);

update public.profiles
set coached_team_id = team_id
where role in ('coach', 'admin')
  and team_id is not null
  and coached_team_id is null;

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

grant insert, update, delete on table public.teams to authenticated;
grant insert, update, delete on table public.players to authenticated;
grant insert, update, delete on table public.matches to authenticated;
grant insert, update, delete on table public.match_events to authenticated;
grant insert, update, delete on table public.match_lineups to authenticated;
grant insert, update, delete on table public.match_substitutions to authenticated;

drop policy if exists "teams_write_admin" on public.teams;
drop policy if exists "teams_write_staff" on public.teams;
create policy "teams_write_staff"
on public.teams for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

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

drop policy if exists "players_delete_admin" on public.players;
drop policy if exists "players_delete_staff" on public.players;
create policy "players_delete_staff"
on public.players for delete
to authenticated
using (public.is_coach_or_admin());

drop policy if exists "matches_write_admin" on public.matches;
drop policy if exists "matches_write_staff" on public.matches;
create policy "matches_write_staff"
on public.matches for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

drop policy if exists "events_write_admin" on public.match_events;
drop policy if exists "events_write_staff" on public.match_events;
create policy "events_write_staff"
on public.match_events for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

drop policy if exists "lineups_write_admin" on public.match_lineups;
drop policy if exists "lineups_write_staff" on public.match_lineups;
create policy "lineups_write_staff"
on public.match_lineups for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

drop policy if exists "substitutions_write_admin" on public.match_substitutions;
drop policy if exists "substitutions_write_staff" on public.match_substitutions;
create policy "substitutions_write_staff"
on public.match_substitutions for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

drop policy if exists "news_write_admin" on public.news;
drop policy if exists "news_write_staff" on public.news;
create policy "news_write_staff"
on public.news for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

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

drop policy if exists "activity_log_admin_select" on public.activity_log;
drop policy if exists "activity_log_staff_select" on public.activity_log;
create policy "activity_log_staff_select"
on public.activity_log for select
to authenticated
using (public.is_coach_or_admin());

drop policy if exists "activity_log_admin_insert" on public.activity_log;
drop policy if exists "activity_log_staff_insert" on public.activity_log;
create policy "activity_log_staff_insert"
on public.activity_log for insert
to authenticated
with check (public.is_coach_or_admin());
