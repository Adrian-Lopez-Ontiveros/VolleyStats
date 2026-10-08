-- Quitar el marco de perfil (equipped_frame = null) sin desbloquear una recompensa nueva.
-- frame_none va antes del rama frame_% porque el _ de LIKE es un comodín.

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
  if p_reward_id = 'frame_none' then
    update public.user_progress set equipped_frame = null where user_id = uid;
    return jsonb_build_object('ok', true, 'reward_id', p_reward_id);
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
  elsif p_reward_id like 'card_%' then
    update public.user_progress set equipped_card = p_reward_id where user_id = uid;
  else
    raise exception 'Esta recompensa no se puede equipar';
  end if;

  return jsonb_build_object('ok', true, 'reward_id', p_reward_id);
end;
$$;
