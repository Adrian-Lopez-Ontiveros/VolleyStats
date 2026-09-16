-- Líbero de recepción y líbero de defensa (el mismo jugador o dos distintos).

alter table public.match_lineups
  add column if not exists is_reception_libero boolean not null default false,
  add column if not exists is_defense_libero boolean not null default false,
  add column if not exists is_active_libero boolean not null default false;

update public.match_lineups
set
  is_reception_libero = true,
  is_defense_libero = true,
  is_active_libero = true
where is_libero
  and not is_reception_libero
  and not is_defense_libero;

drop index if exists public.idx_match_lineups_one_libero;

create unique index if not exists idx_match_lineups_one_reception_libero
  on public.match_lineups (match_id, team_id)
  where is_reception_libero;

create unique index if not exists idx_match_lineups_one_defense_libero
  on public.match_lineups (match_id, team_id)
  where is_defense_libero;

create unique index if not exists idx_match_lineups_one_active_libero
  on public.match_lineups (match_id, team_id)
  where is_active_libero;

create or replace function public.sync_match_lineup_libero()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_libero
     and not coalesce(new.is_reception_libero, false)
     and not coalesce(new.is_defense_libero, false) then
    new.is_reception_libero := true;
    new.is_defense_libero := true;
    if not coalesce(new.is_active_libero, false) then
      new.is_active_libero := true;
    end if;
  end if;

  new.is_libero := coalesce(new.is_reception_libero, false)
    or coalesce(new.is_defense_libero, false);

  if not new.is_libero then
    new.is_active_libero := false;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_match_lineup_libero on public.match_lineups;
create trigger trg_sync_match_lineup_libero
before insert or update on public.match_lineups
for each row execute function public.sync_match_lineup_libero();
