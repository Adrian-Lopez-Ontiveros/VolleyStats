import { FRAME_CLASS } from "@/lib/game";

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function rowsOf(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.filter(
    (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object"
  );
}

export async function rewardFramesByPlayer(
  listPlayers: (ids: string[]) => PromiseLike<QueryResult>,
  listProgress: (userIds: string[]) => PromiseLike<QueryResult>,
  playerIds: string[]
): Promise<Record<string, string>> {
  const ids = [...new Set(playerIds.filter(Boolean))];
  if (ids.length === 0) return {};

  try {
    const players = await listPlayers(ids);
    if (players.error) return {};

    const userByPlayer = new Map<string, string>();
    for (const row of rowsOf(players.data)) {
      if (typeof row.id !== "string" || typeof row.user_id !== "string" || !row.user_id) continue;
      userByPlayer.set(row.id, row.user_id);
    }
    const userIds = [...new Set(userByPlayer.values())];
    if (userIds.length === 0) return {};

    const progress = await listProgress(userIds);
    if (progress.error) return {};

    const frameByUser = new Map<string, string>();
    for (const row of rowsOf(progress.data)) {
      if (typeof row.user_id !== "string" || typeof row.equipped_frame !== "string") continue;
      if (!FRAME_CLASS[row.equipped_frame]) continue;
      frameByUser.set(row.user_id, row.equipped_frame);
    }

    const frames: Record<string, string> = {};
    for (const [playerId, userId] of userByPlayer) {
      const frame = frameByUser.get(userId);
      if (frame) frames[playerId] = frame;
    }
    return frames;
  } catch {
    return {};
  }
}
