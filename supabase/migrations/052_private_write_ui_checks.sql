-- Read-only helpers let the coach UI offer only operations that the RPC would authorize.
create or replace function public.private_can_write_team(p_team_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select private.can_write_team(p_team_id)
    and exists(select 1 from public.teams where id=p_team_id and is_private=true and
      is_one_off=false and is_club_team=false and federation_team_id is null);
$$;
create or replace function public.private_can_write_match(p_match_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select private.can_write_match(p_match_id)
    and exists(select 1 from public.matches where id=p_match_id and is_private=true
      and private_league_id is not null and federation_match_id is null);
$$;
revoke execute on function public.private_can_write_team(uuid) from public,anon;
revoke execute on function public.private_can_write_match(uuid) from public,anon;
grant execute on function public.private_can_write_team(uuid) to authenticated;
grant execute on function public.private_can_write_match(uuid) to authenticated;
