-- Empate en la clasificación del cromo líder:
-- 1) más puntos
-- 2) más resultados exactos
-- 3) menos pronósticos

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
      count(*) filter (where points = 2) as exacts,
      count(*) as played
    from public.match_predictions
    where is_correct is not null
    group by user_id
  ) s
  order by s.pts desc, s.exacts desc, s.played asc, s.user_id
  limit 1;
$$;

grant execute on function public.game_prediction_leader() to authenticated;

select public.game_sync_leader_card();
