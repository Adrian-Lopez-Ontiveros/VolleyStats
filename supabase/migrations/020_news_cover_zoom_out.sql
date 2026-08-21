-- Allow shrinking news covers below 100%.

alter table public.news drop constraint if exists news_cover_zoom_check;

alter table public.news
  add constraint news_cover_zoom_check
    check (cover_zoom >= 0.4 and cover_zoom <= 2.5);
