import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function formatJersey(num: number | null | undefined) {
  if (num === null || num === undefined) return "—";
  return `#${num}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function composeFullName(firstName: string, lastName: string) {
  return normalizeStoredPersonName(`${firstName} ${lastName}`);
}

export function normalizeStoredPersonName(name: string) {
  return name
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePersonName(name: string) {
  return normalizeStoredPersonName(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("es");
}

export function personNameTokens(name: string) {
  return normalizePersonName(name).split(" ").filter(Boolean);
}

export function personNamesMatch(a: string, b: string) {
  const na = normalizePersonName(a);
  const nb = normalizePersonName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const ta = personNameTokens(a);
  const tb = personNameTokens(b);
  if (ta.length === 0 || tb.length === 0) return false;

  const sameTokens =
    ta.length === tb.length && [...ta].sort().join(" ") === [...tb].sort().join(" ");
  if (sameTokens) return true;

  const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return shorter.length >= 2 && shorter.every((token) => longer.includes(token));
}

export function closestPersonName(query: string, names: string[]) {
  const queryTokens = personNameTokens(query);
  if (queryTokens.length === 0) return null;

  const scored = names
    .map((name) => {
      const tokens = personNameTokens(name);
      const overlap = queryTokens.filter((token) => tokens.includes(token)).length;
      return { name, overlap };
    })
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap);

  return scored[0]?.overlap ? scored[0].name : null;
}
