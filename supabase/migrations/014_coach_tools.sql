-- Rol entrenador, entrenamientos, pizarra táctica y análisis de salto.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'user_role'
      and e.enumlabel = 'coach'
  ) then
    alter type public.user_role add value 'coach';
  end if;
end
$$;

create or replace function public.is_coach_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('coach', 'admin')
  );
$$;

grant execute on function public.is_coach_or_admin() to authenticated;

create table if not exists public.trainings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scheduled_at timestamptz not null,
  team_id uuid references public.teams (id) on delete set null,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_files (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_path text not null,
  mime_type text,
  file_size int,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.tactical_plays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  team_id uuid references public.teams (id) on delete set null,
  board jsonb not null default '{"pieces":[]}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jump_analyses (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  training_id uuid references public.trainings (id) on delete set null,
  height_cm numeric(6, 1) not null check (height_cm >= 0 and height_cm <= 200),
  source text not null default 'manual' check (source in ('auto', 'manual')),
  video_url text,
  video_path text,
  takeoff_sec numeric(8, 3),
  landing_sec numeric(8, 3),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_trainings_date on public.trainings (scheduled_at desc);
create index if not exists idx_trainings_team on public.trainings (team_id);
create index if not exists idx_training_files_training on public.training_files (training_id);
create index if not exists idx_tactical_plays_updated on public.tactical_plays (updated_at desc);
create index if not exists idx_jump_analyses_player on public.jump_analyses (player_id, created_at desc);
create index if not exists idx_jump_analyses_training on public.jump_analyses (training_id);

drop trigger if exists trg_trainings_updated_at on public.trainings;
create trigger trg_trainings_updated_at
before update on public.trainings
for each row execute function public.set_updated_at();

drop trigger if exists trg_tactical_plays_updated_at on public.tactical_plays;
create trigger trg_tactical_plays_updated_at
before update on public.tactical_plays
for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.trainings to authenticated;
grant select, insert, update, delete on table public.training_files to authenticated;
grant select, insert, update, delete on table public.tactical_plays to authenticated;
grant select, insert, update, delete on table public.jump_analyses to authenticated;

alter table public.trainings enable row level security;
alter table public.training_files enable row level security;
alter table public.tactical_plays enable row level security;
alter table public.jump_analyses enable row level security;

drop policy if exists "trainings_select_staff" on public.trainings;
create policy "trainings_select_staff"
on public.trainings for select
to authenticated
using (public.is_coach_or_admin());

drop policy if exists "trainings_write_staff" on public.trainings;
create policy "trainings_write_staff"
on public.trainings for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

drop policy if exists "training_files_select_staff" on public.training_files;
create policy "training_files_select_staff"
on public.training_files for select
to authenticated
using (public.is_coach_or_admin());

drop policy if exists "training_files_write_staff" on public.training_files;
create policy "training_files_write_staff"
on public.training_files for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

drop policy if exists "tactical_plays_select_staff" on public.tactical_plays;
create policy "tactical_plays_select_staff"
on public.tactical_plays for select
to authenticated
using (public.is_coach_or_admin());

drop policy if exists "tactical_plays_write_staff" on public.tactical_plays;
create policy "tactical_plays_write_staff"
on public.tactical_plays for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

drop policy if exists "jump_analyses_select_staff" on public.jump_analyses;
create policy "jump_analyses_select_staff"
on public.jump_analyses for select
to authenticated
using (public.is_coach_or_admin());

drop policy if exists "jump_analyses_write_staff" on public.jump_analyses;
create policy "jump_analyses_write_staff"
on public.jump_analyses for all
to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

insert into storage.buckets (id, name, public)
values ('coach-media', 'coach-media', true)
on conflict (id) do nothing;

drop policy if exists "coach_media_public_read" on storage.objects;
create policy "coach_media_public_read"
on storage.objects for select
using (bucket_id = 'coach-media');

drop policy if exists "coach_media_staff_insert" on storage.objects;
create policy "coach_media_staff_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'coach-media' and public.is_coach_or_admin());

drop policy if exists "coach_media_staff_update" on storage.objects;
create policy "coach_media_staff_update"
on storage.objects for update
to authenticated
using (bucket_id = 'coach-media' and public.is_coach_or_admin())
with check (bucket_id = 'coach-media' and public.is_coach_or_admin());

drop policy if exists "coach_media_staff_delete" on storage.objects;
create policy "coach_media_staff_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'coach-media' and public.is_coach_or_admin());
