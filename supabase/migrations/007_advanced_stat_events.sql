-- Acciones que no suman punto (intentos, saque en juego, recepción)
-- y quién estaba sacando en cada acción.

alter table public.match_events
  alter column scoring_team_id drop not null;

alter table public.match_events
  add column if not exists serving_team_id uuid references public.teams (id) on delete restrict;

create index if not exists idx_match_events_serving
  on public.match_events (match_id, serving_team_id);

alter type public.point_type add value if not exists 'attack_error';
alter type public.point_type add value if not exists 'attack_continuation';
alter type public.point_type add value if not exists 'serve_error';
alter type public.point_type add value if not exists 'serve_in';
alter type public.point_type add value if not exists 'reception_good';
alter type public.point_type add value if not exists 'reception_medium';
alter type public.point_type add value if not exists 'reception_bad';
