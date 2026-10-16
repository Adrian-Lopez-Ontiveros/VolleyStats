-- Ajustes > Contacto y sugerencias.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('mejora', 'falta_algo', 'idea', 'bug', 'otro')),
  message text not null check (char_length(message) between 1 and 2000),
  contact_email text null,
  screenshot_path text null,
  user_agent text null,
  app_version text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_user_created
  on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

grant select, insert on table public.feedback to authenticated;

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own"
on public.feedback for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "feedback_select_own_or_admin" on public.feedback;
create policy "feedback_select_own_or_admin"
on public.feedback for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Sin políticas de update/delete: los usuarios no pueden editar ni borrar.

-- Bucket privado para capturas: 5 MB, solo imágenes, cada usuario en su carpeta {uid}/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-screenshots', 'feedback-screenshots', false, 5242880, array['image/*'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "feedback_screenshots_insert_own" on storage.objects;
create policy "feedback_screenshots_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'feedback-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "feedback_screenshots_select_own" on storage.objects;
create policy "feedback_screenshots_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'feedback-screenshots'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
