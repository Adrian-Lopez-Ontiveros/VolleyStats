-- Ajustes: preferencias de notificación por tipo (sustituyen a notify_match_end).
alter table public.profiles
  add column if not exists notify_league_results boolean not null default true,
  add column if not exists notify_news boolean not null default true,
  add column if not exists notify_match_reminder boolean not null default true,
  add column if not exists notify_team_stats boolean not null default false;

-- notify_match_end controlaba a la vez el recordatorio del día antes y el resultado,
-- así que se copia a ambas preferencias. La columna queda deprecada (sin borrar).
update public.profiles
set notify_league_results = notify_match_end,
    notify_match_reminder = notify_match_end;

comment on column public.profiles.notify_match_end is
  'DEPRECADA (042): sustituida por notify_league_results / notify_match_reminder. No usar.';

-- RLS: "profiles_update_own" (id = auth.uid()) ya permite al usuario editar solo su fila,
-- y el trigger protect_profile_updates bloquea role, email, nombre y equipos.
-- Las columnas notify_* quedan editables solo por su dueño (o un admin).

-- Marcas de envío idempotente en partidos.
alter table public.matches
  add column if not exists result_notified_at timestamptz null,
  add column if not exists stats_published_at timestamptz null;

-- No avisar de partidos ya terminados antes de esta migración.
update public.matches
set result_notified_at = coalesce(result_notified_at, now())
where status = 'finished';

update public.matches m
set stats_published_at = coalesce(m.stats_published_at, now())
where m.status = 'finished'
  and exists (select 1 from public.match_events e where e.match_id = m.id);
