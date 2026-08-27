-- Players can view trainings, files, boards and jumps. Writes stay coach/admin.

drop policy if exists "trainings_select_staff" on public.trainings;
drop policy if exists "trainings_select_authenticated" on public.trainings;
create policy "trainings_select_authenticated"
on public.trainings for select
to authenticated
using (true);

drop policy if exists "training_files_select_staff" on public.training_files;
drop policy if exists "training_files_select_authenticated" on public.training_files;
create policy "training_files_select_authenticated"
on public.training_files for select
to authenticated
using (true);

drop policy if exists "tactical_plays_select_staff" on public.tactical_plays;
drop policy if exists "tactical_plays_select_authenticated" on public.tactical_plays;
create policy "tactical_plays_select_authenticated"
on public.tactical_plays for select
to authenticated
using (true);

drop policy if exists "jump_analyses_select_staff" on public.jump_analyses;
drop policy if exists "jump_analyses_select_authenticated" on public.jump_analyses;
create policy "jump_analyses_select_authenticated"
on public.jump_analyses for select
to authenticated
using (true);
