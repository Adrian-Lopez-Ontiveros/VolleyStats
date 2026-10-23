-- Aviso de racha: push opcional (desactivado por defecto) hacia las 21:00 de Madrid
-- si el jugador aún no ha entrado hoy y tiene una racha que perdería.
alter table public.profiles
  add column if not exists notify_streak_reminder boolean not null default false;

comment on column public.profiles.notify_streak_reminder is
  'Opt-in (047): aviso por la tarde si la racha diaria está en riesgo.';

-- Marca idempotente: el cron no avisa dos veces el mismo día.
alter table public.user_progress
  add column if not exists streak_reminded_on date null;

-- RLS: profiles_update_own ya deja a cada usuario cambiar solo su fila.
-- streak_reminded_on lo escribe solo el cron con la clave de servicio.
