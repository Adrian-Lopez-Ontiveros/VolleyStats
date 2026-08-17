-- Vincular pizarras tácticas a un entrenamiento.

alter table public.tactical_plays
  add column if not exists training_id uuid references public.trainings (id) on delete set null;

create index if not exists idx_tactical_plays_training
  on public.tactical_plays (training_id);
