-- 4.º equipo del club: «Nacional Masculino» (Primera División Masculina RFEVB · Grupo D).
-- Datos de esvoley.es (API https://rfevb.fontventa.com/api/competiciones, grupoId 103).
--
-- teams.category es text (sin enum ni check), así que no hace falta cambiar el esquema.
-- Los ids de esvoley se guardan con prefijo «esv:» para no chocar con los de FMV en
-- idx_teams_federation_team / idx_matches_federation_match.
--
-- Solo inserta el equipo del club. Los rivales y los partidos los crea la sincronización
-- (cron /api/cron/fmv-sync o «Actualizar ligas» en admin) la primera vez que corre.
-- Idempotente: no hace nada si ya existe el equipo del club de esa categoría o ese id.

insert into public.teams (name, short_name, category, is_club_team, federation_team_id, logo_url, city)
select
  'CV Fuenlabrada Nacional Masculino',
  'CVF NM',
  'nacional_masculino',
  true,
  'esv:71413',
  -- Mismo escudo que los otros tres equipos del club.
  (select logo_url from public.teams
    where is_club_team and logo_url is not null
    order by created_at limit 1),
  'Fuenlabrada'
where not exists (
  select 1 from public.teams
  where (is_club_team and category = 'nacional_masculino')
     or federation_team_id = 'esv:71413'
);
