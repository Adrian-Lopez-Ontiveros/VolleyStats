-- Senior femenino (51851) and cadete femenino (51848) keep the club crest
-- already uploaded for senior masculino (51854). Their federation crest is empty.

update public.teams as target
set logo_url = source.logo_url
from (
  select logo_url
  from public.teams
  where federation_team_id = '51854'
    and is_club_team
    and logo_url is not null
    and logo_url not like '%fotoEscudoEquipoTemporada%'
  order by updated_at desc
  limit 1
) as source
where target.federation_team_id in ('51848', '51851')
  and target.is_club_team
  and source.logo_url is not null;
