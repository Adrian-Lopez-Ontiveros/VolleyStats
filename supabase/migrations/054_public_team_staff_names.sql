-- Nombres del cuerpo técnico de equipos públicos, también para espectadores.
-- Aprobado por Onti (2026-11-07). Solo lectura: nombre, equipo público donde juega
-- y si está pendiente de registro. Sin emails, ids de usuario ni equipos privados.
-- No amplía el acceso a profiles / team_coaches / staff_roster.

create schema if not exists private;

create or replace function private.team_staff_names(p_team_id uuid)
returns table (full_name text, plays_in_team_name text, plays_here boolean, pending boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with team as (
    select t.id from public.teams t
    where t.id = p_team_id and t.is_private = false
  ),
  coach_users as (
    select tc.user_id as uid from public.team_coaches tc join team on team.id = tc.team_id
    union
    select p.id from public.profiles p join team on team.id = p.coached_team_id
  ),
  linked as (
    select pr.full_name,
           pt.name as play_team,
           (pl.team_id = p_team_id) as plays_here
    from coach_users cu
    join public.profiles pr on pr.id = cu.uid
    left join public.players pl on pl.user_id = pr.id and pl.is_private = false
    left join public.teams pt on pt.id = pl.team_id and pt.is_private = false
  )
  select l.full_name,
         case when coalesce(l.plays_here, false) then null else l.play_team end,
         coalesce(l.plays_here, false),
         false
  from linked l
  union all
  select s.full_name, null, false, true
  from public.staff_roster s join team on team.id = s.coached_team_id
  where s.user_id is null
    and not exists (
      select 1 from linked l
      where lower(trim(l.full_name)) = lower(trim(s.full_name))
    )
  order by 1;
$$;

revoke all on function private.team_staff_names(uuid) from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.team_staff_names(uuid) to anon, authenticated;

-- Punto de entrada RPC (invoker, sin privilegios propios).
create or replace function public.list_team_staff_public(p_team_id uuid)
returns table (full_name text, plays_in_team_name text, plays_here boolean, pending boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.team_staff_names(p_team_id);
$$;

revoke all on function public.list_team_staff_public(uuid) from public;
grant execute on function public.list_team_staff_public(uuid) to anon, authenticated;
