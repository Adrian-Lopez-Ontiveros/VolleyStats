-- Cromo líder: solo puede llevarlo quien va primero en la clasificación.
-- Si le superan, se le quita el cromo y la recompensa pasa al nuevo primero.
-- Requiere match_predictions.points (037).

create or replace function public.game_prediction_leader()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.user_id
  from (
    select
      user_id,
      coalesce(sum(
        case
          when points in (0, 1, 2) then points
          when is_correct then 1
          else 0
        end
      ), 0) as pts,
      count(*) as played
    from public.match_predictions
    where is_correct is not null
    group by user_id
  ) s
  order by s.pts desc, s.played desc, s.user_id
  limit 1;
$$;

create or replace function public.game_sync_leader_card()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  leader uuid;
begin
  leader := public.game_prediction_leader();

  delete from public.user_rewards
  where reward_id = 'card_lider'
    and (leader is null or user_id is distinct from leader);

  update public.user_progress
  set equipped_card = null
  where equipped_card = 'card_lider'
    and (leader is null or user_id is distinct from leader);

  if leader is not null then
    insert into public.user_progress (user_id)
    values (leader)
    on conflict (user_id) do nothing;

    insert into public.user_rewards (user_id, reward_id)
    values (leader, 'card_lider')
    on conflict do nothing;
  end if;

  return leader;
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
  if p_reward_id = 'frame_none' then
    update public.user_progress set equipped_frame = null where user_id = uid;
    return jsonb_build_object('ok', true, 'reward_id', p_reward_id);
  end if;

  if p_reward_id = 'card_lider' then
    perform public.game_sync_leader_card();
    if public.game_prediction_leader() is distinct from uid then
      raise exception 'Solo puede llevarlo quien va primero en la clasificación';
    end if;
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

create or replace function public.game_resolve_match_predictions(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  match_row public.matches%rowtype;
  winner uuid;
  pred record;
  awarded int := 0;
  jornada text;
  table_points int;
begin
  select * into match_row from public.matches where id = p_match_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  jornada := public.game_jornada_key(match_row.scheduled_at);

  if match_row.status = 'cancelled' then
    update public.match_predictions
    set resolved_at = now(), is_correct = null, points = null, xp_awarded = 0
    where match_id = p_match_id
      and resolved_at is null;
    perform public.game_sync_leader_card();
    return jsonb_build_object('ok', true, 'voided', true);
  end if;

  if match_row.status <> 'finished' then
    return jsonb_build_object('ok', false, 'reason', 'not_finished');
  end if;

  if match_row.home_sets = match_row.away_sets then
    return jsonb_build_object('ok', false, 'reason', 'no_winner');
  end if;

  winner := case
    when match_row.home_sets > match_row.away_sets then match_row.home_team_id
    else match_row.away_team_id
  end;

  for pred in
    select * from public.match_predictions
    where match_id = p_match_id
      and resolved_at is null
    for update
  loop
    if pred.predicted_winner_id = winner then
      table_points := case
        when pred.predicted_home_sets = match_row.home_sets
         and pred.predicted_away_sets = match_row.away_sets
        then 2
        else 1
      end;
      update public.match_predictions
      set resolved_at = now(), is_correct = true, points = table_points, xp_awarded = 25
      where id = pred.id;
      perform public.game_add_xp(
        pred.user_id,
        25,
        'prediction',
        jsonb_build_object('match_id', p_match_id, 'points', table_points)
      );
      awarded := awarded + 1;
    else
      update public.match_predictions
      set resolved_at = now(), is_correct = false, points = 0, xp_awarded = 0
      where id = pred.id;
    end if;
    perform public.game_unlock_rewards(pred.user_id);
    perform public.game_maybe_jornada_bonus(pred.user_id, jornada);
  end loop;

  perform public.game_sync_leader_card();
  return jsonb_build_object('ok', true, 'awarded', awarded);
end;
$$;

grant execute on function public.game_prediction_leader() to authenticated;
grant execute on function public.game_sync_leader_card() to authenticated;
grant execute on function public.game_equip_reward(text) to authenticated;
grant execute on function public.game_resolve_match_predictions(uuid) to authenticated;

select public.game_sync_leader_card();
