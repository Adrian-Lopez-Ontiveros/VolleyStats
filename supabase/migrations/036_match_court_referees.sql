-- Pista y árbitros que publica FMVoley en cada partido.

alter table public.matches
  add column if not exists court text,
  add column if not exists referees text;
