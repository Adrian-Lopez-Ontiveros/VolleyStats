-- Error de recepción (suma punto al rival) y acciones de defensa, como recepción.

alter type public.point_type add value if not exists 'reception_error';
alter type public.point_type add value if not exists 'defense_good';
alter type public.point_type add value if not exists 'defense_medium';
alter type public.point_type add value if not exists 'defense_bad';
alter type public.point_type add value if not exists 'defense_error';
