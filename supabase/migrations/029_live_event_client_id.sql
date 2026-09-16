-- Identificador local de cada acción del seguimiento, para subir a la nube sin duplicar.

alter table public.match_events
  add column if not exists client_id text;

create unique index if not exists idx_match_events_client_id
  on public.match_events (match_id, client_id)
  where client_id is not null;
