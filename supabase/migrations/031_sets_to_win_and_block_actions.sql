-- Amistosos al mejor de 3 o 5, toque/continuación de bloqueo, y errores de recepción/defensa en el recálculo.

alter type public.point_type add value if not exists 'block_touch';
alter type public.point_type add value if not exists 'block_continuation';

alter table public.matches
  add column if not exists sets_to_win int not null default 3;

alter table public.matches
  drop constraint if exists matches_sets_to_win_check;

alter table public.matches
  add constraint matches_sets_to_win_check check (sets_to_win in (2, 3));

update public.matches
set sets_to_win = 3
where is_federation is true and sets_to_win <> 3;

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
        where e.point_type in (
          'error',
          'attack_error',
          'serve_error',
          'reception_error',
          'defense_error'
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
