-- Allows a coach to type a rival name without creating an owned roster team.
-- Reuses private one-off rivals with the same case-insensitive name inside the league.
create or replace function public.create_private_match_with_opponent(
  p_league_id uuid,
  p_home_team_id uuid,
  p_opponent_name text,
  p_scheduled_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_opponent_id uuid;
  v_match_id uuid;
  v_name text := btrim(coalesce(p_opponent_name, ''));
begin
  perform private.open_private_rpc();
  if (select auth.uid()) is null then raise exception 'Not authenticated'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    raise exception 'Opponent name must contain between 2 and 100 characters';
  end if;
  if not exists (
    select 1 from public.private_leagues l
    join public.teams t on t.id=p_home_team_id
    where l.id=p_league_id and t.is_private and t.private_league_id=p_league_id
      and l.owner_id=(select auth.uid()) and t.owner_id=(select auth.uid())
      and not coalesce(t.is_one_off,false)
  ) then
    raise exception 'Only the owning coach can create a match for this private team';
  end if;

  select t.id into v_opponent_id from public.teams t
  where t.private_league_id=p_league_id and t.is_private and coalesce(t.is_one_off,false)
    and t.owner_id=(select auth.uid()) and lower(t.name)=lower(v_name)
  order by t.created_at, t.id limit 1;
  if v_opponent_id=p_home_team_id then raise exception 'Opponent must be different from your team'; end if;

  if v_opponent_id is null then
    insert into public.teams(name,short_name,category,owner_id,is_private,private_league_id,is_one_off)
    values(v_name,left(v_name,12),null,(select auth.uid()),true,p_league_id,true)
    returning id into v_opponent_id;
    insert into public.private_league_teams(league_id,team_id) values(p_league_id,v_opponent_id);
  end if;

  insert into public.matches(home_team_id,away_team_id,private_league_id,owner_id,is_private,scheduled_at,created_by,status,sets_to_win,home_sets,away_sets)
  values(p_home_team_id,v_opponent_id,p_league_id,(select auth.uid()),true,p_scheduled_at,(select auth.uid()),'scheduled',3,0,0)
  returning id into v_match_id;
  return v_match_id;
end;
$$;

revoke all on function public.create_private_match_with_opponent(uuid,uuid,text,timestamptz) from public,anon;
grant execute on function public.create_private_match_with_opponent(uuid,uuid,text,timestamptz) to authenticated;

comment on function public.create_private_match_with_opponent is 'Atomically reuses or creates a private one-off opponent, then a scheduled private match.';
