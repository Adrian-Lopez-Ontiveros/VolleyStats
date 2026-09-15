const STORAGE_KEY = "fuenla-pred-picks";

function readAll(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(picks: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
}

export function getPredictionDraft(matchId: string) {
  return readAll()[matchId] ?? null;
}

export function setPredictionDraft(matchId: string, winnerId: string) {
  const picks = readAll();
  picks[matchId] = winnerId;
  writeAll(picks);
}

export function clearPredictionDraft(matchId: string, winnerId: string) {
  const picks = readAll();
  if (picks[matchId] !== winnerId) return;
  delete picks[matchId];
  writeAll(picks);
}
