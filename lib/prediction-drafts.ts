const STORAGE_KEY = "fuenla-pred-picks";

export type PredictionDraft = {
  winnerId: string;
  homeSets: number | null;
  awaySets: number | null;
};

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

function encode(draft: PredictionDraft) {
  if (draft.homeSets == null || draft.awaySets == null) return draft.winnerId;
  return `${draft.winnerId}|${draft.homeSets}-${draft.awaySets}`;
}

function decode(raw: string): PredictionDraft | null {
  const [winnerId, score] = raw.split("|");
  if (!winnerId) return null;
  if (!score) return { winnerId, homeSets: null, awaySets: null };
  const [homeRaw, awayRaw] = score.split("-");
  const homeSets = Number(homeRaw);
  const awaySets = Number(awayRaw);
  if (!Number.isInteger(homeSets) || !Number.isInteger(awaySets)) {
    return { winnerId, homeSets: null, awaySets: null };
  }
  return { winnerId, homeSets, awaySets };
}

export function getPredictionDraft(matchId: string) {
  const raw = readAll()[matchId];
  return raw ? decode(raw) : null;
}

export function setPredictionDraft(matchId: string, draft: PredictionDraft) {
  const picks = readAll();
  picks[matchId] = encode(draft);
  writeAll(picks);
}

export function clearPredictionDraft(matchId: string, draft: PredictionDraft) {
  const picks = readAll();
  if (picks[matchId] !== encode(draft)) return;
  delete picks[matchId];
  writeAll(picks);
}
