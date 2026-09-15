-- Racha diaria, XP, niveles, recompensas y predicciones de jornada.

create table if not exists public.user_progress (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  xp int not null default 0 check (xp >= 0),
  level int not null default 1 check (level >= 1),
  current_streak int not null default 0 check (current_streak >= 0),
  longest_streak int not null default 0 check (longest_streak >= 0),
  last_checkin_on date,
  equipped_title text,
  equipped_frame text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null,
  reason text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_rewards (
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, reward_id)
);

create table if not exists public.match_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  predicted_winner_id uuid not null references public.teams (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  is_correct boolean,
  xp_awarded int not null default 0,
  unique (user_id, match_id)
);

create index if not exists idx_xp_events_user on public.xp_events (user_id, created_at desc);
create index if not exists idx_user_rewards_user on public.user_rewards (user_id);
create index if not exists idx_match_predictions_match on public.match_predictions (match_id);
create index if not exists idx_match_predictions_user on public.match_predictions (user_id);
create index if not exists idx_match_predictions_unresolved
  on public.match_predictions (match_id)
  where resolved_at is null;

drop trigger if exists trg_user_progress_updated_at on public.user_progress;
create trigger trg_user_progress_updated_at
before update on public.user_progress
for each row execute function public.set_updated_at();

drop trigger if exists trg_match_predictions_updated_at on public.match_predictions;
create trigger trg_match_predictions_updated_at
before update on public.match_predictions
for each row execute function public.set_updated_at();

alter table public.user_progress enable row level security;
alter table public.xp_events enable row level security;
alter table public.user_rewards enable row level security;
alter table public.match_predictions enable row level security;

grant select on table public.user_progress to authenticated;
grant select on table public.xp_events to authenticated;
grant select on table public.user_rewards to authenticated;
grant select on table public.match_predictions to authenticated;

drop policy if exists "user_progress_select" on public.user_progress;
create policy "user_progress_select"
on public.user_progress for select
to authenticated
using (true);

drop policy if exists "xp_events_select_own" on public.xp_events;
create policy "xp_events_select_own"
on public.xp_events for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_rewards_select" on public.user_rewards;
create policy "user_rewards_select"
on public.user_rewards for select
to authenticated
using (true);

drop policy if exists "match_predictions_select" on public.match_predictions;
create policy "match_predictions_select"
on public.match_predictions for select
to authenticated
using (true);

create or replace function public.game_init_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_profiles_game_progress on public.profiles;
create trigger trg_profiles_game_progress
after insert on public.profiles
for each row execute function public.game_init_progress();

insert into public.user_progress (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.game_jornada_key(p_scheduled timestamptz)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  select to_char((p_scheduled at time zone 'Europe/Madrid'), 'IYYY-"W"IW');
$$;

create or replace function public.game_level_from_xp(p_xp int)
returns int
language plpgsql
immutable
parallel safe
set search_path = public
as $$
declare
  lvl int := 1;
  remaining int := greatest(coalesce(p_xp, 0), 0);
  need int;
begin
  loop
    need := 100 + (lvl - 1) * 25;
    exit when remaining < need or lvl >= 99;
    remaining := remaining - need;
    lvl := lvl + 1;
  end loop;
  return lvl;
end;
$$;

create or replace function public.game_unlock_rewards(p_user_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  prog public.user_progress%rowtype;
  hits int := 0;
  picks int := 0;
  perfects int := 0;
  newly text[] := '{}';
  rid text;
begin
  select * into prog from public.user_progress where user_id = p_user_id;
  if not found then
    return newly;
  end if;

  select count(*) filter (where is_correct), count(*)
  into hits, picks
  from public.match_predictions
  where user_id = p_user_id;

  select count(*) into perfects
  from public.xp_events
  where user_id = p_user_id
    and reason = 'jornada_perfect';

  for rid in
    select x.reward_id
    from (
      select 'badge_checkin' as reward_id where prog.current_streak >= 1 or prog.last_checkin_on is not null
      union all select 'title_novato' where prog.last_checkin_on is not null or prog.xp > 0
      union all select 'title_aficionado' where prog.level >= 2
      union all select 'title_socio' where prog.level >= 3
      union all select 'frame_naranja' where prog.level >= 4
      union all select 'title_hincha' where prog.level >= 5
      union all select 'badge_level5' where prog.level >= 5
      union all select 'frame_violeta' where prog.level >= 7
      union all select 'title_veterano' where prog.level >= 8
      union all select 'title_leyenda' where prog.level >= 10
      union all select 'badge_level10' where prog.level >= 10
      union all select 'frame_oro' where prog.level >= 12
      union all select 'title_corazon' where prog.level >= 15
      union all select 'title_racha' where prog.current_streak >= 7 or prog.longest_streak >= 7
      union all select 'badge_week' where prog.current_streak >= 7 or prog.longest_streak >= 7
      union all select 'badge_month' where prog.current_streak >= 30 or prog.longest_streak >= 30
      union all select 'title_imparable' where prog.current_streak >= 30 or prog.longest_streak >= 30
      union all select 'badge_first_pick' where picks >= 1
      union all select 'title_profeta' where hits >= 10
      union all select 'badge_oracle' where hits >= 25
      union all select 'title_oraculo' where perfects >= 1
      union all select 'badge_perfect' where perfects >= 1
    ) x
  loop
    insert into public.user_rewards (user_id, reward_id)
    values (p_user_id, rid)
    on conflict do nothing;
    if found then
      newly := array_append(newly, rid);
    end if;
  end loop;

  if prog.equipped_title is null then
    update public.user_progress
    set equipped_title = case
      when exists (select 1 from public.user_rewards where user_id = p_user_id and reward_id = 'title_novato')
      then 'title_novato'
      else equipped_title
    end
    where user_id = p_user_id
      and equipped_title is null;
  end if;

  return newly;
end;
$$;

create or replace function public.game_add_xp(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_meta jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  old_level int;
  new_xp int;
  new_level int;
  unlocked text[];
begin
  if p_amount is null or p_amount <= 0 then
    select xp, level into new_xp, new_level
    from public.user_progress
    where user_id = p_user_id;
    return jsonb_build_object(
      'xp', coalesce(new_xp, 0),
      'level', coalesce(new_level, 1),
      'leveled_up', false,
      'unlocked', '[]'::jsonb
    );
  end if;

  insert into public.user_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select level into old_level
  from public.user_progress
  where user_id = p_user_id
  for update;

  update public.user_progress
  set xp = xp + p_amount
  where user_id = p_user_id
  returning xp into new_xp;

  new_level := public.game_level_from_xp(new_xp);

  update public.user_progress
  set level = new_level
  where user_id = p_user_id
    and level <> new_level;

  insert into public.xp_events (user_id, amount, reason, meta)
  values (p_user_id, p_amount, p_reason, coalesce(p_meta, '{}'::jsonb));

  unlocked := public.game_unlock_rewards(p_user_id);

  return jsonb_build_object(
    'xp', new_xp,
    'level', new_level,
    'leveled_up', new_level > old_level,
    'unlocked', to_jsonb(coalesce(unlocked, '{}'))
  );
end;
$$;

create or replace function public.game_claim_daily_checkin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (timezone('Europe/Madrid', now()))::date;
  yesterday date := today - 1;
  prog public.user_progress%rowtype;
  new_streak int;
  gained int := 0;
  xp_result jsonb;
  unlocked text[] := '{}';
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.user_progress (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  select * into prog
  from public.user_progress
  where user_id = uid
  for update;

  if prog.last_checkin_on = today then
    return jsonb_build_object(
      'claimed', false,
      'already', true,
      'xp_gained', 0,
      'xp', prog.xp,
      'level', prog.level,
      'streak', prog.current_streak,
      'longest', prog.longest_streak,
      'leveled_up', false,
      'unlocked', '[]'::jsonb,
      'equipped_title', prog.equipped_title,
      'equipped_frame', prog.equipped_frame
    );
  end if;

  if prog.last_checkin_on = yesterday then
    new_streak := prog.current_streak + 1;
  else
    new_streak := 1;
  end if;

  gained := 10 + least(new_streak, 30) * 5;
  if new_streak = 7 then gained := gained + 40; end if;
  if new_streak = 14 then gained := gained + 80; end if;
  if new_streak = 30 then gained := gained + 150; end if;

  update public.user_progress
  set
    current_streak = new_streak,
    longest_streak = greatest(longest_streak, new_streak),
    last_checkin_on = today
  where user_id = uid;

  xp_result := public.game_add_xp(
    uid,
    gained,
    'checkin',
    jsonb_build_object('streak', new_streak)
  );

  select coalesce(array_agg(value), '{}')
  into unlocked
  from jsonb_array_elements_text(coalesce(xp_result->'unlocked', '[]'::jsonb)) as value;

  select * into prog from public.user_progress where user_id = uid;

  return jsonb_build_object(
    'claimed', true,
    'already', false,
    'xp_gained', gained,
    'xp', prog.xp,
    'level', prog.level,
    'streak', prog.current_streak,
    'longest', prog.longest_streak,
    'leveled_up', coalesce((xp_result->>'leveled_up')::boolean, false),
    'unlocked', to_jsonb(unlocked),
    'equipped_title', prog.equipped_title,
    'equipped_frame', prog.equipped_frame
  );
end;
$$;

create or replace function public.game_save_prediction(p_match_id uuid, p_winner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  match_row public.matches%rowtype;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into match_row from public.matches where id = p_match_id;
  if not found then
    raise exception 'Partido no encontrado';
  end if;
  if match_row.status <> 'scheduled' then
    raise exception 'Las predicciones se cierran cuando el partido empieza';
  end if;
  if p_winner_id is distinct from match_row.home_team_id
     and p_winner_id is distinct from match_row.away_team_id then
    raise exception 'Elige el equipo local o el visitante';
  end if;

  insert into public.user_progress (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  insert into public.match_predictions (user_id, match_id, predicted_winner_id)
  values (uid, p_match_id, p_winner_id)
  on conflict (user_id, match_id) do update
    set predicted_winner_id = excluded.predicted_winner_id
    where public.match_predictions.resolved_at is null;

  if not found then
    raise exception 'Esta predicción ya está cerrada';
  end if;

  perform public.game_unlock_rewards(uid);

  return jsonb_build_object('ok', true, 'match_id', p_match_id, 'winner_id', p_winner_id);
end;
$$;

create or replace function public.game_maybe_jornada_bonus(p_user_id uuid, p_jornada text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_matches int;
  user_picks int;
  correct_picks int;
  unresolved int;
begin
  if p_jornada is null or p_jornada = '' then
    return;
  end if;

  if exists (
    select 1 from public.xp_events
    where user_id = p_user_id
      and reason = 'jornada_perfect'
      and meta->>'jornada' = p_jornada
  ) then
    return;
  end if;

  select count(*) into total_matches
  from public.matches m
  where public.game_jornada_key(m.scheduled_at) = p_jornada
    and m.status <> 'cancelled'
    and (
      exists (select 1 from public.teams t where t.id = m.home_team_id and t.is_club_team)
      or exists (select 1 from public.teams t where t.id = m.away_team_id and t.is_club_team)
    );

  if total_matches < 2 then
    return;
  end if;

  select
    count(*),
    count(*) filter (where p.is_correct),
    count(*) filter (where p.resolved_at is null)
  into user_picks, correct_picks, unresolved
  from public.match_predictions p
  join public.matches m on m.id = p.match_id
  where p.user_id = p_user_id
    and public.game_jornada_key(m.scheduled_at) = p_jornada
    and m.status <> 'cancelled'
    and (
      exists (select 1 from public.teams t where t.id = m.home_team_id and t.is_club_team)
      or exists (select 1 from public.teams t where t.id = m.away_team_id and t.is_club_team)
    );

  if user_picks = total_matches and unresolved = 0 and correct_picks = total_matches then
    perform public.game_add_xp(
      p_user_id,
      50,
      'jornada_perfect',
      jsonb_build_object('jornada', p_jornada, 'hits', correct_picks)
    );
  end if;
end;
$$;

create or replace function public.game_resolve_match_predictions(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  match_row public.matches%rowtype;
  winner uuid;
  pred record;
  awarded int := 0;
  jornada text;
begin
  select * into match_row from public.matches where id = p_match_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  jornada := public.game_jornada_key(match_row.scheduled_at);

  if match_row.status = 'cancelled' then
    update public.match_predictions
    set resolved_at = now(), is_correct = null, xp_awarded = 0
    where match_id = p_match_id
      and resolved_at is null;
    return jsonb_build_object('ok', true, 'voided', true);
  end if;

  if match_row.status <> 'finished' then
    return jsonb_build_object('ok', false, 'reason', 'not_finished');
  end if;

  if match_row.home_sets = match_row.away_sets then
    return jsonb_build_object('ok', false, 'reason', 'no_winner');
  end if;

  winner := case
    when match_row.home_sets > match_row.away_sets then match_row.home_team_id
    else match_row.away_team_id
  end;

  for pred in
    select * from public.match_predictions
    where match_id = p_match_id
      and resolved_at is null
    for update
  loop
    if pred.predicted_winner_id = winner then
      update public.match_predictions
      set resolved_at = now(), is_correct = true, xp_awarded = 25
      where id = pred.id;
      perform public.game_add_xp(
        pred.user_id,
        25,
        'prediction',
        jsonb_build_object('match_id', p_match_id)
      );
      awarded := awarded + 1;
    else
      update public.match_predictions
      set resolved_at = now(), is_correct = false, xp_awarded = 0
      where id = pred.id;
    end if;
    perform public.game_unlock_rewards(pred.user_id);
    perform public.game_maybe_jornada_bonus(pred.user_id, jornada);
  end loop;

  return jsonb_build_object('ok', true, 'awarded', awarded);
end;
$$;

create or replace function public.game_resolve_pending()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  match_id uuid;
  n int := 0;
begin
  for match_id in
    select distinct p.match_id
    from public.match_predictions p
    join public.matches m on m.id = p.match_id
    where p.resolved_at is null
      and m.status in ('finished', 'cancelled')
  loop
    perform public.game_resolve_match_predictions(match_id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

create or replace function public.game_equip_reward(p_reward_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_reward_id is null or p_reward_id = '' then
    raise exception 'Recompensa no válida';
  end if;
  if not exists (
    select 1 from public.user_rewards
    where user_id = uid and reward_id = p_reward_id
  ) then
    raise exception 'Todavía no has desbloqueado esta recompensa';
  end if;

  if p_reward_id like 'title_%' then
    update public.user_progress set equipped_title = p_reward_id where user_id = uid;
  elsif p_reward_id like 'frame_%' then
    update public.user_progress set equipped_frame = p_reward_id where user_id = uid;
  else
    raise exception 'Esta recompensa no se puede equipar';
  end if;

  return jsonb_build_object('ok', true, 'reward_id', p_reward_id);
end;
$$;

revoke all on function public.game_add_xp(uuid, int, text, jsonb) from public, anon, authenticated;
revoke all on function public.game_unlock_rewards(uuid) from public, anon, authenticated;
revoke all on function public.game_maybe_jornada_bonus(uuid, text) from public, anon, authenticated;
revoke all on function public.game_init_progress() from public, anon, authenticated;

grant execute on function public.game_jornada_key(timestamptz) to authenticated;
grant execute on function public.game_level_from_xp(int) to authenticated;
grant execute on function public.game_claim_daily_checkin() to authenticated;
grant execute on function public.game_save_prediction(uuid, uuid) to authenticated;
grant execute on function public.game_resolve_match_predictions(uuid) to authenticated;
grant execute on function public.game_resolve_pending() to authenticated;
grant execute on function public.game_equip_reward(text) to authenticated;
