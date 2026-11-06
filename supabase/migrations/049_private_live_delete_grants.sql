-- The private-data hardening revoked DELETE for every API role, including private
-- owners. Restore it only where the existing private match editor check passes.
grant delete on table public.match_lineups,
  public.match_substitutions,
  public.match_events to authenticated;

create policy private_lineup_delete on public.match_lineups
for delete to authenticated using (
  exists (
    select 1 from public.matches m
    where m.id=match_id and m.is_private and private.can_write_match(m.id)
  )
);

create policy private_substitution_delete on public.match_substitutions
for delete to authenticated using (
  exists (
    select 1 from public.matches m
    where m.id=match_id and m.is_private and private.can_write_match(m.id)
  )
);

create policy private_event_delete on public.match_events
for delete to authenticated using (
  exists (
    select 1 from public.matches m
    where m.id=match_id and m.is_private and private.can_write_match(m.id)
  )
);
