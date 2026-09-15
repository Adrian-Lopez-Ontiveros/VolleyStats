-- Solo se puede predecir la jornada más próxima (la del siguiente partido del club).

create or replace function public.game_nearest_jornada_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.game_jornada_key(m.scheduled_at)
  from public.matches m
  where m.status in ('scheduled', 'live')
    and (
      exists (select 1 from public.teams t where t.id = m.home_team_id and t.is_club_team)
      or exists (select 1 from public.teams t where t.id = m.away_team_id and t.is_club_team)
    )
  order by m.scheduled_at
  limit 1;
$$;

create or replace function public.game_save_prediction(p_match_id uuid, p_winner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  match_row public.matches%rowtype;
  nearest text;
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
  if p_winner_id is distinct from match_row.home_team_id
     and p_winner_id is distinct from match_row.away_team_id then
    raise exception 'Elige el equipo local o el visitante';
  end if;

  nearest := public.game_nearest_jornada_key();
  if nearest is null
     or public.game_jornada_key(match_row.scheduled_at) is distinct from nearest then
    raise exception 'Solo puedes predecir la jornada más próxima';
  end if;

  insert into public.user_progress (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  insert into public.match_predictions (user_id, match_id, predicted_winner_id)
  values (uid, p_match_id, p_winner_id)
  on conflict (user_id, match_id) do update
    set predicted_winner_id = excluded.predicted_winner_id
    where public.match_predictions.resolved_at is null;

  if not found then
    raise exception 'Esta predicción ya está cerrada';
  end if;

  perform public.game_unlock_rewards(uid);

  return jsonb_build_object('ok', true, 'match_id', p_match_id, 'winner_id', p_winner_id);
end;
$$;

grant execute on function public.game_nearest_jornada_key() to authenticated;
grant execute on function public.game_save_prediction(uuid, uuid) to authenticated;
