-- Familias (tutores), convocatorias y cuotas. Ejecutar en Supabase → SQL Editor.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'user_role'
      and e.enumlabel = 'tutor'
  ) then
    alter type public.user_role add value 'tutor';
  end if;
end
$$;

create or replace function public.is_tutor_or_admin()
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
      and role in ('tutor', 'admin')
  );
$$;

grant execute on function public.is_tutor_or_admin() to authenticated;

create or replace function public.is_guardian_of(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.guardian_links g
      where g.profile_id = auth.uid()
        and g.player_id = p_player_id
    )
    or exists (
      select 1
      from public.players p
      where p.id = p_player_id
        and p.user_id = auth.uid()
    );
$$;

grant execute on function public.is_guardian_of(uuid) to authenticated;

create table if not exists public.guardian_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, player_id)
);

create table if not exists public.match_callups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'yes', 'no')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create table if not exists public.player_fees (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  concept text not null,
  amount_cents int not null check (amount_cents >= 0),
  due_at date,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_guardian_links_profile on public.guardian_links (profile_id);
create index if not exists idx_guardian_links_player on public.guardian_links (player_id);
create index if not exists idx_callups_match on public.match_callups (match_id);
create index if not exists idx_callups_player on public.match_callups (player_id);
create index if not exists idx_fees_player on public.player_fees (player_id, status);

grant select, insert, delete on table public.guardian_links to authenticated;
grant select, insert, update on table public.match_callups to authenticated;
grant select, insert, update, delete on table public.player_fees to authenticated;

alter table public.guardian_links enable row level security;
alter table public.match_callups enable row level security;
alter table public.player_fees enable row level security;

drop policy if exists "guardian_links_select" on public.guardian_links;
create policy "guardian_links_select"
on public.guardian_links for select
to authenticated
using (profile_id = auth.uid() or public.is_admin() or public.is_coach_or_admin());

drop policy if exists "guardian_links_write_admin" on public.guardian_links;
create policy "guardian_links_write_admin"
on public.guardian_links for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "callups_select" on public.match_callups;
create policy "callups_select"
on public.match_callups for select
to authenticated
using (public.is_guardian_of(player_id) or public.is_coach_or_admin());

drop policy if exists "callups_insert_staff" on public.match_callups;
create policy "callups_insert_staff"
on public.match_callups for insert
to authenticated
with check (public.is_coach_or_admin() or public.is_guardian_of(player_id));

drop policy if exists "callups_update_family" on public.match_callups;
create policy "callups_update_family"
on public.match_callups for update
to authenticated
using (public.is_guardian_of(player_id) or public.is_coach_or_admin())
with check (public.is_guardian_of(player_id) or public.is_coach_or_admin());

drop policy if exists "fees_select" on public.player_fees;
create policy "fees_select"
on public.player_fees for select
to authenticated
using (public.is_guardian_of(player_id) or public.is_coach_or_admin());

drop policy if exists "fees_write_admin" on public.player_fees;
create policy "fees_write_admin"
on public.player_fees for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
