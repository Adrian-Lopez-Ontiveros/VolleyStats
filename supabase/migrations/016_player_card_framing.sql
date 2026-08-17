-- Reencuadre de foto y nombre visible en el cromo.

alter table public.player_cards
  add column if not exists photo_focus_x numeric(5, 2) not null default 50,
  add column if not exists photo_focus_y numeric(5, 2) not null default 18,
  add column if not exists photo_zoom numeric(4, 2) not null default 1,
  add column if not exists name_mode text not null default 'last',
  add column if not exists display_name text;

alter table public.player_cards
  drop constraint if exists player_cards_photo_focus_x_check,
  drop constraint if exists player_cards_photo_focus_y_check,
  drop constraint if exists player_cards_photo_zoom_check,
  drop constraint if exists player_cards_name_mode_check;

alter table public.player_cards
  add constraint player_cards_photo_focus_x_check
    check (photo_focus_x >= 0 and photo_focus_x <= 100),
  add constraint player_cards_photo_focus_y_check
    check (photo_focus_y >= 0 and photo_focus_y <= 100),
  add constraint player_cards_photo_zoom_check
    check (photo_zoom >= 1 and photo_zoom <= 2.5),
  add constraint player_cards_name_mode_check
    check (name_mode in ('last', 'full', 'custom'));
