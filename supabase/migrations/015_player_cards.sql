-- Cromos tipo FIFA de cada jugador: foto, posición y 6 estadísticas (1-99).

create or replace function public.owns_player(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.players
    where id = target_player_id
      and user_id = auth.uid()
  );
$$;

grant execute on function public.owns_player(uuid) to authenticated;

create table if not exists public.player_cards (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null unique references public.players (id) on delete cascade,
  photo_url text,
  position public.player_position,
  jump int not null default 50 check (jump between 1 and 99),
  attack int not null default 50 check (attack between 1 and 99),
  block int not null default 50 check (block between 1 and 99),
  serve int not null default 50 check (serve between 1 and 99),
  reception int not null default 50 check (reception between 1 and 99),
  defense int not null default 50 check (defense between 1 and 99),
  rating_override int check (rating_override is null or rating_override between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_player_cards_player on public.player_cards (player_id);

drop trigger if exists trg_player_cards_updated_at on public.player_cards;
create trigger trg_player_cards_updated_at
before update on public.player_cards
for each row execute function public.set_updated_at();

grant select on table public.player_cards to anon, authenticated;
grant select, insert, update, delete on table public.player_cards to authenticated;

alter table public.player_cards enable row level security;

drop policy if exists "player_cards_select_public" on public.player_cards;
create policy "player_cards_select_public"
on public.player_cards for select
to anon, authenticated
using (true);

drop policy if exists "player_cards_insert_own" on public.player_cards;
create policy "player_cards_insert_own"
on public.player_cards for insert
to authenticated
with check (public.is_admin() or public.owns_player(player_id));

drop policy if exists "player_cards_update_own" on public.player_cards;
create policy "player_cards_update_own"
on public.player_cards for update
to authenticated
using (public.is_admin() or public.owns_player(player_id))
with check (public.is_admin() or public.owns_player(player_id));

drop policy if exists "player_cards_delete_own" on public.player_cards;
create policy "player_cards_delete_own"
on public.player_cards for delete
to authenticated
using (public.is_admin() or public.owns_player(player_id));
