alter table public.profiles
  add column if not exists notify_match_end boolean not null default false;

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text not null,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_log_match
  on public.activity_log (match_id, created_at desc);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id);

alter table public.activity_log enable row level security;
alter table public.push_subscriptions enable row level security;

grant select, insert on table public.activity_log to authenticated;
grant select, insert, delete, update on table public.push_subscriptions to authenticated;

drop policy if exists "activity_log_admin_select" on public.activity_log;
create policy "activity_log_admin_select"
on public.activity_log for select
to authenticated
using (public.is_admin());

drop policy if exists "activity_log_admin_insert" on public.activity_log;
create policy "activity_log_admin_insert"
on public.activity_log for insert
to authenticated
with check (public.is_admin());

drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own"
on public.push_subscriptions for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "push_write_own" on public.push_subscriptions;
create policy "push_write_own"
on public.push_subscriptions for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
