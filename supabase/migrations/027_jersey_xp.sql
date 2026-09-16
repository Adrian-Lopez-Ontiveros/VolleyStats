-- El jugador puede editar su dorsal y ganar XP la primera vez.

create or replace function public.protect_player_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
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

create or replace function public.game_claim_jersey_xp()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  already int;
  result jsonb;
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  select count(*) into already
  from public.xp_events
  where user_id = uid
    and reason = 'jersey';

  if already > 0 then
    return jsonb_build_object(
      'claimed', false,
      'xp_gained', 0
    );
  end if;

  result := public.game_add_xp(uid, 20, 'jersey', '{}'::jsonb);

  return jsonb_build_object(
    'claimed', true,
    'xp_gained', 20,
    'xp', result->'xp',
    'level', result->'level',
    'leveled_up', result->'leveled_up',
    'unlocked', coalesce(result->'unlocked', '[]'::jsonb)
  );
end;
$$;

grant execute on function public.game_claim_jersey_xp() to authenticated;
