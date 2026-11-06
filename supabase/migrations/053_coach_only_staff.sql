-- Rol solo-entrenador: alta sin ficha de jugador, varios equipos por entrenador,
-- y quitar de plantilla sin borrar filas ni estadísticas.
-- Requiere OK de Onti (aprobado 2026-11-06).

-- 1) Plantilla de staff (registro como entrenador sin ser jugador)
create table if not exists public.staff_roster (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  coached_team_id uuid references public.teams (id) on delete set null,
  user_id uuid unique references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_staff_roster_name on public.staff_roster (full_name);
create index if not exists idx_staff_roster_user on public.staff_roster (user_id);

alter table public.staff_roster enable row level security;

drop policy if exists "staff_roster_select_auth" on public.staff_roster;
create policy "staff_roster_select_auth"
on public.staff_roster for select
to authenticated
using (true);

drop policy if exists "staff_roster_select_anon_signup" on public.staff_roster;
create policy "staff_roster_select_anon_signup"
on public.staff_roster for select
to anon
using (user_id is null);

drop policy if exists "staff_roster_write_admin" on public.staff_roster;
create policy "staff_roster_write_admin"
on public.staff_roster for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on table public.staff_roster to anon, authenticated;
grant insert, update, delete on table public.staff_roster to authenticated;

create or replace function public.list_staff_for_signup()
returns table (id uuid, full_name text, user_id uuid, coached_team_id uuid)
language sql
security definer
set search_path = public
as $$
  select s.id, s.full_name, s.user_id, s.coached_team_id
  from public.staff_roster s;
$$;

revoke all on function public.list_staff_for_signup() from public;
grant execute on function public.list_staff_for_signup() to anon, authenticated;

-- 2) Varios equipos por entrenador (N:M). Se rellena desde coached_team_id.
create table if not exists public.team_coaches (
  user_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, team_id)
);

create index if not exists idx_team_coaches_team on public.team_coaches (team_id);
create index if not exists idx_team_coaches_user on public.team_coaches (user_id);

alter table public.team_coaches enable row level security;

drop policy if exists "team_coaches_select_auth" on public.team_coaches;
create policy "team_coaches_select_auth"
on public.team_coaches for select
to authenticated
using (true);

drop policy if exists "team_coaches_write_admin" on public.team_coaches;
create policy "team_coaches_write_admin"
on public.team_coaches for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on table public.team_coaches to authenticated;
grant insert, update, delete on table public.team_coaches to authenticated;

insert into public.team_coaches (user_id, team_id)
select p.id, p.coached_team_id
from public.profiles p
where p.coached_team_id is not null
  and p.role in ('coach', 'admin')
on conflict do nothing;

-- 3) Quitar de plantilla SIN borrar la fila ni las estadísticas.
create or replace function public.detach_club_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_coach_or_admin() then
    raise exception 'Solo un entrenador o administrador puede quitar a un jugador de la plantilla';
  end if;

  if not exists (
    select 1 from public.players
    where id = p_player_id and is_private = false
  ) then
    raise exception 'Jugador no encontrado';
  end if;

  update public.profiles p
  set team_id = null,
      updated_at = now()
  from public.players pl
  where pl.id = p_player_id
    and pl.user_id = p.id
    and p.team_id is not null
    and p.team_id = pl.team_id;

  update public.players
  set team_id = null,
      jersey_number = null,
      position = null,
      updated_at = now()
  where id = p_player_id
    and is_private = false;
end;
$$;

revoke all on function public.detach_club_player(uuid) from public;
grant execute on function public.detach_club_player(uuid) to authenticated;

-- 4) Alta: permitir staff_id → rol coach + coached_team_id + team_coaches, sin ficha de jugador.
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
  meta_staff uuid;
  linked_team uuid;
  linked_name text;
  meta_avatar text;
  name_matches int;
  staff_team uuid;
  staff_name text;
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

  begin
    meta_staff := nullif(new.raw_user_meta_data->>'staff_id', '')::uuid;
  exception when others then
    meta_staff := null;
  end;

  meta_avatar := nullif(new.raw_user_meta_data->>'avatar_url', '');
  linked_team := null;
  linked_name := meta_name;
  staff_team := null;
  staff_name := null;

  -- Preferencia: ficha de jugador si viene; si no, staff (solo entrenador).
  if meta_player is not null then
    select team_id, full_name into linked_team, linked_name
    from public.players
    where id = meta_player
      and user_id is null;
  elsif meta_staff is not null then
    select coached_team_id, full_name into staff_team, staff_name
    from public.staff_roster
    where id = meta_staff
      and user_id is null;
    if staff_name is not null then
      new_role := 'coach';
      linked_name := staff_name;
    else
      meta_staff := null;
    end if;
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
    else
      select count(*) into name_matches
      from public.staff_roster s
      where s.user_id is null
        and public.person_names_match(s.full_name, meta_name);

      if name_matches = 1 then
        select s.id, s.coached_team_id, s.full_name
        into meta_staff, staff_team, staff_name
        from public.staff_roster s
        where s.user_id is null
          and public.person_names_match(s.full_name, meta_name);
        new_role := 'coach';
        linked_name := staff_name;
      end if;
    end if;
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, role, team_id, coached_team_id)
  values (
    new.id,
    new.email,
    coalesce(linked_name, meta_name),
    meta_avatar,
    new_role,
    linked_team,
    case when meta_staff is not null then staff_team else null end
  );

  if meta_player is not null then
    update public.players
    set user_id = new.id
    where id = meta_player
      and user_id is null;
  end if;

  if meta_staff is not null then
    update public.staff_roster
    set user_id = new.id,
        updated_at = now()
    where id = meta_staff
      and user_id is null;

    if staff_team is not null then
      insert into public.team_coaches (user_id, team_id)
      values (new.id, staff_team)
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;
