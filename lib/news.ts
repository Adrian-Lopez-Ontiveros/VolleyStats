import type { ClubNews } from "@/lib/types";

export type CoverFrame = {
  x: number;
  y: number;
  zoom: number;
};

export const DEFAULT_COVER_FRAME: CoverFrame = { x: 50, y: 50, zoom: 1 };
export const MIN_COVER_ZOOM = 0.4;
export const MAX_COVER_ZOOM = 2.5;

export function newsExcerpt(body: string, max = 140) {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function clampCoverFocus(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

export function clampCoverZoom(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_COVER_ZOOM, Math.max(MIN_COVER_ZOOM, Math.round(value * 100) / 100));
}

export function coverFrameFromNews(news?: Pick<ClubNews, "cover_focus_x" | "cover_focus_y" | "cover_zoom"> | null): CoverFrame {
  return {
    x: clampCoverFocus(Number(news?.cover_focus_x ?? DEFAULT_COVER_FRAME.x)),
    y: clampCoverFocus(Number(news?.cover_focus_y ?? DEFAULT_COVER_FRAME.y)),
    zoom: clampCoverZoom(Number(news?.cover_zoom ?? DEFAULT_COVER_FRAME.zoom)),
  };
}

export function coverImageStyle(frame: CoverFrame) {
  return {
    objectFit: frame.zoom < 1 ? "contain" : "cover",
    objectPosition: `${frame.x}% ${frame.y}%`,
    transform: frame.zoom === 1 ? undefined : `scale(${frame.zoom})`,
    transformOrigin: `${frame.x}% ${frame.y}%`,
  } as const;
}
