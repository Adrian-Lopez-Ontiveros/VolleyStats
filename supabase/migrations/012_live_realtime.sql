alter table public.matches replica identity full;
alter table public.match_events replica identity full;
alter table public.match_substitutions replica identity full;
alter table public.match_lineups replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'matches'
  ) then
    execute 'alter publication supabase_realtime add table public.matches';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'match_events'
  ) then
    execute 'alter publication supabase_realtime add table public.match_events';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'match_substitutions'
  ) then
    execute 'alter publication supabase_realtime add table public.match_substitutions';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'match_lineups'
  ) then
    execute 'alter publication supabase_realtime add table public.match_lineups';
  end if;
end $$;
