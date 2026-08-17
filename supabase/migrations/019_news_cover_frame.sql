-- Reencuadre y zoom de la portada de noticias.

alter table public.news
  add column if not exists cover_focus_x numeric(5, 2) not null default 50,
  add column if not exists cover_focus_y numeric(5, 2) not null default 50,
  add column if not exists cover_zoom numeric(4, 2) not null default 1;

alter table public.news
  drop constraint if exists news_cover_focus_x_check,
  drop constraint if exists news_cover_focus_y_check,
  drop constraint if exists news_cover_zoom_check;

alter table public.news
  add constraint news_cover_focus_x_check
    check (cover_focus_x >= 0 and cover_focus_x <= 100),
  add constraint news_cover_focus_y_check
    check (cover_focus_y >= 0 and cover_focus_y <= 100),
  add constraint news_cover_zoom_check
    check (cover_zoom >= 1 and cover_zoom <= 2.5);
