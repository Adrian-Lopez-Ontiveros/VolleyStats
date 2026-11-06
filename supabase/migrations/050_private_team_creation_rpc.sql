-- Container creation needs INSERT ... RETURNING id before calling the team RPC.
-- Return the team atomically instead of evaluating that exposed read-through policy.
create or replace function public.create_private_team_container(
  p_name text,
  p_short_name text default null,
  p_category text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_league_id uuid;
  v_uid uuid := (select auth.uid());
begin
  perform private.open_private_rpc();
  if v_uid is null or not private.is_coach() then
    raise exception 'Only a coach or administrator can create a private team';
  end if;
  if character_length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'Team name must contain at least two characters';
  end if;

  insert into public.private_leagues (name, owner_id)
  values ('Mis equipos', v_uid)
  returning id into v_league_id;

  -- The existing check ensures the same authenticated profile owns the container.
  return public.create_private_team(v_league_id, p_name, p_short_name, p_category);
end;
$$;

revoke execute on function public.create_private_team_container(text, text, text) from public, anon;
grant execute on function public.create_private_team_container(text, text, text) to authenticated;
