-- Estilos de cromo por aciertos y block-out como punto del rival.

alter table public.user_progress
  add column if not exists equipped_card text;

create or replace function public.recompute_player_stats(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.players p
  set
    attack_points = coalesce(s.attack_points, 0),
    block_points = coalesce(s.block_points, 0),
    aces = coalesce(s.aces, 0),
    errors = coalesce(s.errors, 0),
    opponent_errors = coalesce(s.opponent_errors, 0),
    other_points = coalesce(s.other_points, 0),
    matches_played = coalesce(s.matches_played, 0)
  from (
    select
      e.player_id,
      count(*) filter (where e.point_type = 'attack') as attack_points,
      count(*) filter (where e.point_type = 'block') as block_points,
      count(*) filter (where e.point_type = 'ace') as aces,
      count(*) filter (
        where e.point_type::text in (
          'error',
          'attack_error',
          'serve_error',
          'reception_error',
          'defense_error',
          'block_error'
        )
      ) as errors,
      count(*) filter (where e.point_type = 'opponent_error') as opponent_errors,
      count(*) filter (where e.point_type = 'other') as other_points,
      count(distinct e.match_id) as matches_played
    from public.match_events e
    where e.player_id = p_player_id
    group by e.player_id
  ) s
  where p.id = p_player_id
    and p.id = s.player_id;

  if not found then
    update public.players
    set
      attack_points = 0,
      block_points = 0,
      aces = 0,
      errors = 0,
      opponent_errors = 0,
      other_points = 0,
      matches_played = 0
    where id = p_player_id;
  end if;
end;
$$;

do $$
declare
  pid uuid;
begin
  for pid in
    select distinct player_id
    from public.match_events
    where point_type::text = 'blockout'
      and player_id is not null
  loop
    perform public.recompute_player_stats(pid);
  end loop;
end $$;

create or replace function public.game_unlock_rewards(p_user_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  prog public.user_progress%rowtype;
  hits int := 0;
  picks int := 0;
  perfects int := 0;
  newly text[] := '{}';
  rid text;
begin
  select * into prog from public.user_progress where user_id = p_user_id;
  if not found then
    return newly;
  end if;

  select count(*) filter (where is_correct), count(*)
  into hits, picks
  from public.match_predictions
  where user_id = p_user_id;

  select count(*) into perfects
  from public.xp_events
  where user_id = p_user_id
    and reason = 'jornada_perfect';

  for rid in
    select x.reward_id
    from (
      select 'badge_checkin' as reward_id where prog.current_streak >= 1 or prog.last_checkin_on is not null
      union all select 'title_novato' where prog.last_checkin_on is not null or prog.xp > 0
      union all select 'title_aficionado' where prog.level >= 2
      union all select 'title_socio' where prog.level >= 3
      union all select 'frame_naranja' where prog.level >= 4
      union all select 'title_hincha' where prog.level >= 5
      union all select 'badge_level5' where prog.level >= 5
      union all select 'frame_violeta' where prog.level >= 7
      union all select 'title_veterano' where prog.level >= 8
      union all select 'title_leyenda' where prog.level >= 10
      union all select 'badge_level10' where prog.level >= 10
      union all select 'frame_oro' where prog.level >= 12
      union all select 'title_corazon' where prog.level >= 15
      union all select 'title_racha' where prog.current_streak >= 7 or prog.longest_streak >= 7
      union all select 'badge_week' where prog.current_streak >= 7 or prog.longest_streak >= 7
      union all select 'badge_month' where prog.current_streak >= 30 or prog.longest_streak >= 30
      union all select 'title_imparable' where prog.current_streak >= 30 or prog.longest_streak >= 30
      union all select 'badge_first_pick' where picks >= 1
      union all select 'title_profeta' where hits >= 10
      union all select 'badge_oracle' where hits >= 25
      union all select 'card_quiniela' where hits >= 5
      union all select 'card_profeta' where hits >= 10
      union all select 'card_vidente' where hits >= 25
      union all select 'card_leyenda' where hits >= 50
      union all select 'title_oraculo' where perfects >= 1
      union all select 'badge_perfect' where perfects >= 1
    ) x
  loop
    insert into public.user_rewards (user_id, reward_id)
    values (p_user_id, rid)
    on conflict do nothing;
    if found then
      newly := array_append(newly, rid);
    end if;
  end loop;

  if prog.equipped_title is null then
    update public.user_progress
    set equipped_title = case
      when exists (select 1 from public.user_rewards where user_id = p_user_id and reward_id = 'title_novato')
      then 'title_novato'
      else equipped_title
    end
    where user_id = p_user_id
      and equipped_title is null;
  end if;

  return newly;
end;
$$;

create or replace function public.game_equip_reward(p_reward_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_reward_id is null or p_reward_id = '' then
    raise exception 'Recompensa no válida';
  end if;
  if not exists (
    select 1 from public.user_rewards
    where user_id = uid and reward_id = p_reward_id
  ) then
    raise exception 'Todavía no has desbloqueado esta recompensa';
  end if;

  if p_reward_id like 'title_%' then
    update public.user_progress set equipped_title = p_reward_id where user_id = uid;
  elsif p_reward_id like 'frame_%' then
    update public.user_progress set equipped_frame = p_reward_id where user_id = uid;
  elsif p_reward_id like 'card_%' then
    update public.user_progress set equipped_card = p_reward_id where user_id = uid;
  else
    raise exception 'Esta recompensa no se puede equipar';
  end if;

  return jsonb_build_object('ok', true, 'reward_id', p_reward_id);
end;
$$;

do $$
declare
  uid uuid;
begin
  for uid in select user_id from public.user_progress
  loop
    perform public.game_unlock_rewards(uid);
  end loop;
end $$;
