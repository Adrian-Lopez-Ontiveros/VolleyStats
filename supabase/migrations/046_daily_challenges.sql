-- Retos diarios: XP una vez al día por reto, registrada en xp_events
-- (reason = 'daily_challenge', meta = {challenge, day}). Reutiliza game_add_xp,
-- así que suben nivel y desbloquean recompensas igual que el resto de la XP.

-- Garantía en la base de datos de «una vez al día por reto».
create unique index if not exists uq_xp_events_daily_challenge
on public.xp_events (user_id, (meta->>'challenge'), (meta->>'day'))
where reason = 'daily_challenge';

-- Evalúa los retos de hoy (Madrid), concede la XP de los completados que aún no se
-- hayan cobrado y devuelve el estado de cada uno.
--   entrar    (10 XP): ha hecho el check-in diario hoy.
--   predecir  (20 XP): tiene pronóstico en todos los partidos abiertos de la jornada
--                      más próxima del club (y hay al menos uno).
--   comentar  (10 XP): ha comentado hoy alguna noticia.
--   exacto    (30 XP): hoy se ha resuelto un pronóstico suyo con el marcador exacto.
create or replace function public.game_daily_challenges()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (timezone('Europe/Madrid', now()))::date;
  day_text text := to_char((timezone('Europe/Madrid', now()))::date, 'YYYY-MM-DD');
  day_start timestamptz := (today::timestamp at time zone 'Europe/Madrid');
  nearest text;
  open_count int := 0;
  missing_count int := 0;
  ch record;
  is_done boolean;
  is_claimed boolean;
  result jsonb := '[]'::jsonb;
  gained int := 0;
  xp_result jsonb;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  nearest := public.game_nearest_jornada_key();

  if nearest is not null then
    select
      count(*),
      count(*) filter (
        where not exists (
          select 1 from public.match_predictions p
          where p.match_id = m.id and p.user_id = uid
        )
      )
    into open_count, missing_count
    from public.matches m
    where m.status = 'scheduled'
      and m.scheduled_at - interval '5 minutes' > now()
      and public.game_jornada_key(m.scheduled_at) = nearest
      and (
        exists (select 1 from public.teams t where t.id = m.home_team_id and t.is_club_team)
        or exists (select 1 from public.teams t where t.id = m.away_team_id and t.is_club_team)
      );
  end if;

  for ch in
    select * from (values
      ('entrar', 10),
      ('predecir', 20),
      ('comentar', 10),
      ('exacto', 30)
    ) as c(id, xp)
  loop
    is_done := case ch.id
      when 'entrar' then exists (
        select 1 from public.user_progress
        where user_id = uid and last_checkin_on = today
      )
      when 'predecir' then open_count > 0 and missing_count = 0
      when 'comentar' then exists (
        select 1 from public.news_comments
        where user_id = uid and created_at >= day_start
      )
      when 'exacto' then exists (
        select 1 from public.match_predictions
        where user_id = uid and points = 2 and resolved_at >= day_start
      )
      else false
    end;

    is_claimed := exists (
      select 1 from public.xp_events
      where user_id = uid
        and reason = 'daily_challenge'
        and meta->>'challenge' = ch.id
        and meta->>'day' = day_text
    );

    if is_done and not is_claimed then
      begin
        xp_result := public.game_add_xp(
          uid,
          ch.xp,
          'daily_challenge',
          jsonb_build_object('challenge', ch.id, 'day', day_text)
        );
        gained := gained + ch.xp;
        is_claimed := true;
      exception when unique_violation then
        is_claimed := true; -- otra pestaña lo cobró a la vez
      end;
    end if;

    result := result || jsonb_build_array(jsonb_build_object(
      'id', ch.id,
      'xp', ch.xp,
      'done', is_done,
      'claimed', is_claimed
    ));
  end loop;

  return jsonb_build_object('day', day_text, 'xp_gained', gained, 'challenges', result);
end;
$$;

revoke all on function public.game_daily_challenges() from public, anon;
grant execute on function public.game_daily_challenges() to authenticated;
