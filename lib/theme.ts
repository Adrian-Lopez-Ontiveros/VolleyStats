export const THEME_STORAGE_KEY = "fuenla-theme";
export const COLOR_THEME_STORAGE_KEY = "fuenla-color-theme";
export const FONT_SIZE_STORAGE_KEY = "fuenla-font-size";

export const COLOR_THEMES = [
  "original",
  "c-hielo-acero",
  "a-cobalto-sol",
  "b-grafito-rojo",
] as const;
export type ColorTheme = (typeof COLOR_THEMES)[number];

export const FONT_SIZES = ["sm", "md", "lg"] as const;
export type FontSize = (typeof FONT_SIZES)[number];

/**
 * Script anti-parpadeo del <head>: aplica claro/oscuro, el tema de color (data-theme)
 * y el tamaño de texto (data-font-size) antes de pintar.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")d.classList.add("dark");var t=localStorage.getItem("${COLOR_THEME_STORAGE_KEY}");if(t&&t!=="original"&&${JSON.stringify(COLOR_THEMES)}.indexOf(t)>-1)d.setAttribute("data-theme",t);var f=localStorage.getItem("${FONT_SIZE_STORAGE_KEY}");if(f==="sm"||f==="lg")d.setAttribute("data-font-size",f);}catch(e){}})();`;

export function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode */
  }
}

export function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function isColorTheme(value: unknown): value is ColorTheme {
  return typeof value === "string" && (COLOR_THEMES as readonly string[]).includes(value);
}

export function applyColorTheme(theme: ColorTheme) {
  const root = document.documentElement;
  if (theme === "original") delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode */
  }
}

export function readColorTheme(): ColorTheme {
  if (typeof document === "undefined") return "original";
  const value = document.documentElement.dataset.theme;
  return isColorTheme(value) ? value : "original";
}

export function applyFontSize(size: FontSize) {
  const root = document.documentElement;
  if (size === "md") delete root.dataset.fontSize;
  else root.dataset.fontSize = size;
  try {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
  } catch {
    /* private mode */
  }
}

export function readFontSize(): FontSize {
  if (typeof document === "undefined") return "md";
  const value = document.documentElement.dataset.fontSize;
  return value === "sm" || value === "lg" ? value : "md";
}
