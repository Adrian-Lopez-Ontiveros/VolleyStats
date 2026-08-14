-- Corrige la vinculación perfil ↔ jugador.
-- El trigger protect_player_updates impedía guardar user_id al registrarse
-- (solo un admin podía cambiar ese campo, y el alta no es admin).
-- Ejecutar en Supabase → SQL Editor.

-- 1) Permitir vincular user_id cuando todavía es null.
create or replace function public.protect_player_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Alta / SQL editor no tienen JWT. Admin puede editar todo.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  -- Se puede reclamar un jugador sin cuenta. No se puede cambiar ni desvincular.
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

-- Permitir asignar equipo al perfil si aún no tiene.
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

-- 2) RPC para que un usuario logueado reclame su ficha de plantilla.
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

  -- Preferir mismo equipo + mismo nombre; si no, solo nombre.
  select p.id into chosen
  from public.players p
  where p.user_id is null
    and (
      (to_regprocedure('public.person_names_match(text,text)') is not null
        and public.person_names_match(p.full_name, pname))
      or lower(trim(p.full_name)) = lower(trim(pname))
    )
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

-- 3) Reparar cuentas ya registradas (Ismael, Adrián, etc.).
with candidates as (
  select
    pr.id as profile_id,
    p.id as player_id,
    count(*) over (partition by pr.id) as profile_matches,
    count(*) over (partition by p.id) as player_matches
  from public.profiles pr
  join public.players p
    on p.user_id is null
   and (
     (to_regprocedure('public.person_names_match(text,text)') is not null
       and public.person_names_match(p.full_name, pr.full_name))
     or lower(trim(p.full_name)) = lower(trim(pr.full_name))
   )
  where not exists (
    select 1
    from public.players linked
    where linked.user_id = pr.id
  )
)
update public.players p
set user_id = c.profile_id
from candidates c
where p.id = c.player_id
  and c.profile_matches = 1
  and c.player_matches = 1;

-- Si el alta antigua (001) creó un jugador vacío con user_id y la plantilla
-- tiene otro con dorsal/posición, mover el vínculo a la ficha real.
do $$
declare
  rec record;
begin
  for rec in
    select
      empty.id as empty_id,
      roster.id as roster_id,
      empty.user_id
    from public.players empty
    join public.players roster
      on roster.id <> empty.id
     and roster.user_id is null
     and (
       (to_regprocedure('public.person_names_match(text,text)') is not null
         and public.person_names_match(empty.full_name, roster.full_name))
       or lower(trim(empty.full_name)) = lower(trim(roster.full_name))
     )
    where empty.user_id is not null
      and empty.jersey_number is null
      and empty.position is null
      and (roster.jersey_number is not null or roster.position is not null)
  loop
    update public.match_events
    set player_id = rec.roster_id
    where player_id = rec.empty_id;

    update public.players
    set user_id = null
    where id = rec.empty_id;

    update public.players
    set user_id = rec.user_id
    where id = rec.roster_id;

    delete from public.players
    where id = rec.empty_id;
  end loop;
end $$;
