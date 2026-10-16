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

/**
 * Texto plano para avisos push: quita HTML y marcas de Markdown y corta en ~120
 * caracteres por un límite de palabra, con puntos suspensivos.
 */
export function newsPlainExcerpt(body: string, max = 120) {
  const text = body
    .replace(/<[^>]*>/g, " ") // etiquetas HTML
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // imágenes ![alt](url)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // enlaces [texto](url)
    .replace(/```[\s\S]*?```/g, " ") // bloques de código
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, "") // títulos, citas, listas
    .replace(/(\*\*|__|\*|_|~~)(?=\S)([\s\S]*?\S)\1/g, "$2") // negrita, cursiva, tachado
    .replace(/^\s*([-*_])(\s*\1){2,}\s*$/gm, " ") // separadores ---
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : text.slice(0, max);
  return `${base.replace(/[\s.,;:!?¡¿\-–—]+$/u, "")}…`;
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
