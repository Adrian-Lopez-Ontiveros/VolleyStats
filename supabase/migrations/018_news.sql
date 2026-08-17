-- Tablón de noticias del club.

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  cover_url text,
  cover_path text,
  published_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_news_published on public.news (published_at desc);

drop trigger if exists trg_news_updated_at on public.news;
create trigger trg_news_updated_at
before update on public.news
for each row execute function public.set_updated_at();

grant select on table public.news to anon, authenticated;
grant select, insert, update, delete on table public.news to authenticated;

alter table public.news enable row level security;

drop policy if exists "news_select_public" on public.news;
create policy "news_select_public"
on public.news for select
to anon, authenticated
using (true);

drop policy if exists "news_write_admin" on public.news;
create policy "news_write_admin"
on public.news for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('news', 'news', true)
on conflict (id) do nothing;

drop policy if exists "news_public_read" on storage.objects;
create policy "news_public_read"
on storage.objects for select
using (bucket_id = 'news');

drop policy if exists "news_admin_insert" on storage.objects;
create policy "news_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'news' and public.is_admin());

drop policy if exists "news_admin_update" on storage.objects;
create policy "news_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'news' and public.is_admin())
with check (bucket_id = 'news' and public.is_admin());

drop policy if exists "news_admin_delete" on storage.objects;
create policy "news_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'news' and public.is_admin());
