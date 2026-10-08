import { USER_PROGRESS_SELECT, USER_PROGRESS_SELECT_BASE } from "@/lib/constants";
import { cardSkin } from "@/lib/player-card";
import type { UserProgress } from "@/lib/types";

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

export function missingEquippedCardColumn(message?: string | null) {
  return Boolean(message && /equipped_card/i.test(message));
}

export function withEquippedCard(data: unknown): UserProgress | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Partial<UserProgress>;
  if (typeof row.user_id !== "string") return null;
  return {
    user_id: row.user_id,
    xp: Number(row.xp ?? 0),
    level: Number(row.level ?? 1),
    current_streak: Number(row.current_streak ?? 0),
    longest_streak: Number(row.longest_streak ?? 0),
    last_checkin_on: typeof row.last_checkin_on === "string" ? row.last_checkin_on : null,
    equipped_title: typeof row.equipped_title === "string" ? row.equipped_title : null,
    equipped_frame: typeof row.equipped_frame === "string" ? row.equipped_frame : null,
    equipped_card: typeof row.equipped_card === "string" ? row.equipped_card : null,
    created_at: typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString(),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : new Date(0).toISOString(),
  };
}

export async function readUserProgress(
  query: (columns: string) => PromiseLike<QueryResult>
): Promise<{ data: UserProgress | null; error: { message: string } | null }> {
  const full = await query(USER_PROGRESS_SELECT);
  if (full.error && missingEquippedCardColumn(full.error.message)) {
    const base = await query(USER_PROGRESS_SELECT_BASE);
    return { data: withEquippedCard(base.data), error: base.error };
  }
  return { data: withEquippedCard(full.data), error: full.error };
}

export async function equippedCardForPlayer(
  lookupUserId: () => PromiseLike<QueryResult>,
  lookupProgress: (userId: string, columns: string) => PromiseLike<QueryResult>
): Promise<string | null> {
  const link = await lookupUserId();
  if (link.error || !link.data || typeof link.data !== "object") return null;
  const userId = (link.data as { user_id?: unknown }).user_id;
  if (typeof userId !== "string" || !userId) return null;
  const progress = await readUserProgress((columns) => lookupProgress(userId, columns));
  const card = progress.data?.equipped_card ?? null;
  return card && cardSkin(card) ? card : null;
}
