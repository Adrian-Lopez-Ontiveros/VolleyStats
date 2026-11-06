-- Only SECURITY DEFINER can cascade private data through the restricted API grants.
-- Every entry point requires the current user to write the specifically private target.
create or replace function private.delete_tracked_match(p_match_id uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.match_substitutions where match_id=p_match_id;
  delete from public.match_events where match_id=p_match_id;
  delete from public.match_lineups where match_id=p_match_id;
  delete from public.matches where id=p_match_id and is_private=true;
$$;

create or replace function private.delete_unused_one_off(p_team_id uuid,p_league_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.teams where id=p_team_id and is_private=true and is_one_off=true
    and private_league_id=p_league_id)
    and not exists (select 1 from public.matches where home_team_id=p_team_id or away_team_id=p_team_id)
  then
    delete from public.team_members where team_id=p_team_id;
    delete from public.private_league_teams where team_id=p_team_id and league_id=p_league_id;
    delete from public.teams where id=p_team_id and is_private=true and is_one_off=true
      and is_club_team=false and federation_team_id is null and private_league_id=p_league_id;
  end if;
end;
$$;

create or replace function public.delete_private_match(p_match_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_match public.matches%rowtype;
  v_opponent uuid;
begin
  select * into v_match from public.matches m
  where m.id=p_match_id and m.is_private=true and m.private_league_id is not null
    and coalesce(m.is_federation,false)=false and m.federation_match_id is null
    and private.can_write_match(m.id)
    and private.can_write_team(m.home_team_id)
  for update;
  if not found then raise exception 'Only an editor can delete a private match'; end if;
  if exists (select 1 from public.teams t where t.id=v_match.away_team_id and t.is_private=true
    and t.is_one_off=true and t.private_league_id=v_match.private_league_id)
  then v_opponent:=v_match.away_team_id; end if;
  perform private.delete_tracked_match(p_match_id);
  perform private.delete_unused_one_off(v_opponent,v_match.private_league_id);
end;
$$;

create or replace function public.remove_private_player(p_team_id uuid,p_player_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select private.can_write_team(p_team_id))
    or not exists (select 1 from public.teams where id=p_team_id and is_private=true
      and is_one_off=false and is_club_team=false and federation_team_id is null)
  then raise exception 'Only an editor can remove a private player'; end if;
  if not exists (select 1 from public.players where id=p_player_id and team_id=p_team_id and is_private=true) then
    raise exception 'The player does not belong to this private roster';
  end if;
  -- Upcoming selections can be redone. Historic actions, names and substitutions stay intact.
  delete from public.match_substitutions where match_id in (
    select id from public.matches where status='scheduled' and is_private=true and
      (home_team_id=p_team_id or away_team_id=p_team_id))
    and (player_out_id=p_player_id or player_in_id=p_player_id);
  delete from public.match_lineups where player_id=p_player_id and match_id in (
    select id from public.matches where status='scheduled' and is_private=true and
      (home_team_id=p_team_id or away_team_id=p_team_id));
  update public.players set team_id=null, jersey_number=null, position=null
  where id=p_player_id and team_id=p_team_id and is_private=true;
  if not found then raise exception 'The player does not belong to this private roster'; end if;
end;
$$;

create or replace function public.delete_private_team(p_team_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_league uuid;
  v_match record;
begin
  select private_league_id into v_league from public.teams t
  where t.id=p_team_id and t.is_private=true and t.is_one_off=false
    and t.is_club_team=false and t.federation_team_id is null and t.private_league_id is not null
    and private.can_write_team(t.id)
  for update;
  if not found then raise exception 'Only an editor can delete a private roster team'; end if;
  if exists (select 1 from public.matches m where (m.home_team_id=p_team_id or m.away_team_id=p_team_id)
    and (not m.is_private or m.private_league_id is distinct from v_league)) then
    raise exception 'This team has data outside its private workspace';
  end if;

  for v_match in select id,home_team_id,away_team_id from public.matches m
    where m.is_private=true and m.private_league_id=v_league and (m.home_team_id=p_team_id or m.away_team_id=p_team_id)
    order by id
  loop
    perform private.delete_tracked_match(v_match.id);
    perform private.delete_unused_one_off(v_match.away_team_id,v_league);
    perform private.delete_unused_one_off(v_match.home_team_id,v_league);
  end loop;
  delete from public.match_lineups where team_id=p_team_id;
  delete from public.match_substitutions where team_id=p_team_id;
  -- No surviving match can refer to this team; reject rather than remove any such event.
  update public.players set team_id=null where team_id=p_team_id and is_private=true;
  update public.profiles set team_id=null,coached_team_id=null
  where team_id=p_team_id or coached_team_id=p_team_id;
  delete from public.team_members where team_id=p_team_id;
  delete from public.private_league_teams where team_id=p_team_id and league_id=v_league;
  delete from public.teams where id=p_team_id and is_private=true and is_one_off=false
    and is_club_team=false and federation_team_id is null;
  delete from public.private_leagues l where l.id=v_league
    and not exists(select 1 from public.private_league_teams lt where lt.league_id=l.id);
end;
$$;

revoke execute on function public.delete_private_team(uuid) from public,anon;
revoke execute on function public.delete_private_match(uuid) from public,anon;
revoke execute on function public.remove_private_player(uuid,uuid) from public,anon;
grant execute on function public.delete_private_team(uuid) to authenticated;
grant execute on function public.delete_private_match(uuid) to authenticated;
grant execute on function public.remove_private_player(uuid,uuid) to authenticated;
revoke execute on function private.delete_tracked_match(uuid) from public,anon,authenticated;
revoke execute on function private.delete_unused_one_off(uuid,uuid) from public,anon,authenticated;
