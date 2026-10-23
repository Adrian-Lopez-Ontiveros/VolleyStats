-- Noticias: comentarios y reacciones con emoji de usuarios registrados.
-- Moderación: cada usuario edita/borra lo suyo; admins y el autor de la noticia pueden borrar comentarios.

create table if not exists public.news_comments (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references public.news (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_news_comments_news on public.news_comments (news_id, created_at);
create index if not exists idx_news_comments_user on public.news_comments (user_id, created_at desc);

drop trigger if exists trg_news_comments_updated_at on public.news_comments;
create trigger trg_news_comments_updated_at
before update on public.news_comments
for each row execute function public.set_updated_at();

create table if not exists public.news_reactions (
  news_id uuid not null references public.news (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('👏', '🔥', '❤️', '😂', '😮', '🏐')),
  created_at timestamptz not null default now(),
  primary key (news_id, user_id, emoji)
);

create index if not exists idx_news_reactions_news on public.news_reactions (news_id);

grant select on table public.news_comments to authenticated;
grant insert, update, delete on table public.news_comments to authenticated;
grant select on table public.news_reactions to anon, authenticated;
grant insert, delete on table public.news_reactions to authenticated;

alter table public.news_comments enable row level security;
alter table public.news_reactions enable row level security;

-- Comentarios: los leen los usuarios registrados.
drop policy if exists "news_comments_select" on public.news_comments;
create policy "news_comments_select"
on public.news_comments for select
to authenticated
using (true);

drop policy if exists "news_comments_insert_own" on public.news_comments;
create policy "news_comments_insert_own"
on public.news_comments for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "news_comments_update_own" on public.news_comments;
create policy "news_comments_update_own"
on public.news_comments for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "news_comments_delete" on public.news_comments;
create policy "news_comments_delete"
on public.news_comments for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.news n
    where n.id = news_comments.news_id
      and n.created_by = auth.uid()
  )
);

-- Reacciones: recuento visible para todos; cada usuario pone/quita solo las suyas.
drop policy if exists "news_reactions_select" on public.news_reactions;
create policy "news_reactions_select"
on public.news_reactions for select
to anon, authenticated
using (true);

drop policy if exists "news_reactions_insert_own" on public.news_reactions;
create policy "news_reactions_insert_own"
on public.news_reactions for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "news_reactions_delete_own" on public.news_reactions;
create policy "news_reactions_delete_own"
on public.news_reactions for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());
