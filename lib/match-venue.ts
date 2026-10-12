const EMPTY_COURT = new Set(["", "-", "por definir", "0", "s/n", "sn"]);

export function cleanCourt(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  const folded = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (EMPTY_COURT.has(folded)) return "";
  return trimmed;
}

export function courtLabel(court: string | null | undefined) {
  const value = cleanCourt(court);
  if (!value) return "";
  if (/^pista\b/i.test(value)) return value.replace(/^pista/i, "Pista");
  return `Pista ${value}`;
}

export function displayPersonName(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const letters = trimmed.replace(/[^\p{L}]/gu, "");
  if (!letters || letters !== letters.toUpperCase()) return trimmed;
  return trimmed
    .toLocaleLowerCase("es")
    .replace(/(^|[\s-])(\p{L})/gu, (_match, separator: string, char: string) => {
      return `${separator}${char.toLocaleUpperCase("es")}`;
    });
}

export function joinReferees(names: readonly string[]) {
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const name of names) {
    const label = displayPersonName(name);
    const key = label.toLocaleLowerCase("es");
    if (!label || seen.has(key)) continue;
    seen.add(key);
    clean.push(label);
  }
  return clean.join(" · ");
}

export function refereeList(referees: string | null | undefined) {
  return (referees ?? "")
    .split(/\s*·\s*|\s*\|\s*|,\s*/)
    .map((name) => displayPersonName(name))
    .filter(Boolean);
}

export function refereeLabel(referees: string | null | undefined) {
  const names = refereeList(referees);
  if (names.length === 0) return "";
  return `Árbitro${names.length === 1 ? "" : "s"}: ${names.join(", ")}`;
}
