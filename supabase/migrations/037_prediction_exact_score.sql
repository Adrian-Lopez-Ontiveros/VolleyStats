-- Resultado exacto en la quiniela.
-- Acertar el equipo suma 1 punto. Acertar equipo y marcador suma 2.
-- Local: 3-0, 3-1, 3-2 (o 2-0, 2-1 si es al mejor de 3).
-- Visitante: 0-3, 1-3, 2-3 (o 0-2, 1-2).

alter table public.match_predictions
  add column if not exists predicted_home_sets smallint,
  add column if not exists predicted_away_sets smallint,
  add column if not exists points smallint;

alter table public.match_predictions
  drop constraint if exists match_predictions_score_check;

alter table public.match_predictions
  add constraint match_predictions_score_check check (
    (
      predicted_home_sets is null
      and predicted_away_sets is null
    )
    or (
      predicted_home_sets is not null
      and predicted_away_sets is not null
      and (
        (predicted_home_sets = 3 and predicted_away_sets in (0, 1, 2))
        or (predicted_away_sets = 3 and predicted_home_sets in (0, 1, 2))
        or (predicted_home_sets = 2 and predicted_away_sets in (0, 1))
        or (predicted_away_sets = 2 and predicted_home_sets in (0, 1))
      )
    )
  );

alter table public.match_predictions
  drop constraint if exists match_predictions_points_check;

alter table public.match_predictions
  add constraint match_predictions_points_check check (
    points is null or points in (0, 1, 2)
  );

update public.match_predictions
set points = case
  when is_correct then 1
  when is_correct = false then 0
  else null
end
where resolved_at is not null
  and points is null;

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

  return jsonb_build_object('ok', true, 'awarded', awarded);
end;
$$;

drop function if exists public.game_save_prediction(uuid, uuid);

create or replace function public.game_save_prediction(
  p_match_id uuid,
  p_winner_id uuid,
  p_home_sets int default null,
  p_away_sets int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  match_row public.matches%rowtype;
  nearest text;
  sets_needed int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into match_row from public.matches where id = p_match_id;
  if not found then
    raise exception 'Partido no encontrado';
  end if;
  if match_row.status <> 'scheduled' then
    raise exception 'Las predicciones se cierran cuando el partido empieza';
  end if;
  if match_row.scheduled_at is null
     or match_row.scheduled_at - interval '5 minutes' <= now() then
    raise exception 'Las predicciones se cierran 5 minutos antes del partido';
  end if;
  if p_winner_id is distinct from match_row.home_team_id
     and p_winner_id is distinct from match_row.away_team_id then
    raise exception 'Elige el equipo local o el visitante';
  end if;

  sets_needed := case
    when match_row.is_federation then 3
    when match_row.sets_to_win = 2 then 2
    else 3
  end;

  if p_home_sets is not null or p_away_sets is not null then
    if p_home_sets is null or p_away_sets is null then
      raise exception 'El resultado exacto tiene que incluir los dos números';
    elsif p_winner_id = match_row.home_team_id then
      if p_home_sets is distinct from sets_needed
         or p_away_sets < 0
         or p_away_sets >= sets_needed then
        raise exception 'Ese resultado no vale si gana el local';
      end if;
    elsif p_away_sets is distinct from sets_needed
       or p_home_sets < 0
       or p_home_sets >= sets_needed then
      raise exception 'Ese resultado no vale si gana el visitante';
    end if;
  end if;

  nearest := public.game_nearest_jornada_key();
  if nearest is null
     or public.game_jornada_key(match_row.scheduled_at) is distinct from nearest then
    raise exception 'Solo puedes predecir la jornada más próxima';
  end if;

  insert into public.user_progress (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  insert into public.match_predictions (
    user_id,
    match_id,
    predicted_winner_id,
    predicted_home_sets,
    predicted_away_sets
  )
  values (uid, p_match_id, p_winner_id, p_home_sets, p_away_sets)
  on conflict (user_id, match_id) do update
    set predicted_winner_id = excluded.predicted_winner_id,
        predicted_home_sets = excluded.predicted_home_sets,
        predicted_away_sets = excluded.predicted_away_sets
    where public.match_predictions.resolved_at is null;

  if not found then
    raise exception 'Esta predicción ya está cerrada';
  end if;

  perform public.game_unlock_rewards(uid);

  return jsonb_build_object(
    'ok', true,
    'match_id', p_match_id,
    'winner_id', p_winner_id,
    'home_sets', p_home_sets,
    'away_sets', p_away_sets
  );
end;
$$;

grant execute on function public.game_save_prediction(uuid, uuid, int, int) to authenticated;
grant execute on function public.game_resolve_match_predictions(uuid) to authenticated;
