-- Marca de aviso enviado el día anterior al partido.

alter table public.matches
  add column if not exists reminder_sent_at timestamptz;
