-- Recompensas solo por resultado exacto (points = 2).
-- Acertar únicamente el equipo no cuenta.
-- Requiere la columna match_predictions.points de 037_prediction_exact_score.sql.

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
  exact_hits int := 0;
  newly text[] := '{}';
  rid text;
begin
  select * into prog from public.user_progress where user_id = p_user_id;
  if not found then
    return newly;
  end if;

  select
    count(*) filter (where is_correct),
    count(*),
    count(*) filter (where points = 2)
  into hits, picks, exact_hits
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
      union all select 'badge_marcador' where exact_hits >= 1
      union all select 'title_exacto' where exact_hits >= 3
      union all select 'card_marcador' where exact_hits >= 5
      union all select 'card_pleno' where exact_hits >= 10
      union all select 'frame_escarlata' where exact_hits >= 15
      union all select 'card_infalible' where exact_hits >= 25
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

do $$
declare
  uid uuid;
begin
  for uid in select user_id from public.user_progress
  loop
    perform public.game_unlock_rewards(uid);
  end loop;
end $$;
