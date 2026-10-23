// Comentarios y reacciones en noticias (migración 045).
import type { SupabaseClient } from "@supabase/supabase-js";

export const NEWS_REACTION_EMOJIS = ["👏", "🔥", "❤️", "😂", "😮", "🏐"] as const;
export type NewsReactionEmoji = (typeof NEWS_REACTION_EMOJIS)[number];

export type NewsCommentView = {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
  edited: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type NewsReactionCount = { emoji: NewsReactionEmoji; count: number; mine: boolean };

export type NewsSocialData = {
  available: boolean;
  comments: NewsCommentView[];
  reactions: NewsReactionCount[];
};

/** Carga comentarios (solo con sesión) y reacciones. Sin la migración: available=false. */
export async function loadNewsSocial(
  supabase: SupabaseClient,
  newsId: string,
  viewer: { userId: string | null; isAdmin: boolean; isNewsAuthor: boolean }
): Promise<NewsSocialData> {
  const many = await loadNewsSocialMany(supabase, [{ id: newsId, isNewsAuthor: viewer.isNewsAuthor }], viewer);
  return many.get(newsId) ?? { available: false, comments: [], reactions: [] };
}

/** Igual que loadNewsSocial pero para varias noticias a la vez (listado de /noticias). */
export async function loadNewsSocialMany(
  supabase: SupabaseClient,
  news: { id: string; isNewsAuthor: boolean }[],
  viewer: { userId: string | null; isAdmin: boolean }
): Promise<Map<string, NewsSocialData>> {
  const result = new Map<string, NewsSocialData>();
  const ids = news.map((item) => item.id);
  if (ids.length === 0) return result;

  const reactionsQuery = await supabase
    .from("news_reactions")
    .select("news_id, emoji, user_id")
    .in("news_id", ids);
  if (reactionsQuery.error) {
    for (const id of ids) result.set(id, { available: false, comments: [], reactions: [] });
    return result;
  }

  const counts = new Map<string, { count: number; mine: boolean }>();
  for (const row of (reactionsQuery.data ?? []) as { news_id: string; emoji: string; user_id: string }[]) {
    const key = `${row.news_id}|${row.emoji}`;
    const current = counts.get(key) ?? { count: 0, mine: false };
    current.count += 1;
    if (row.user_id === viewer.userId) current.mine = true;
    counts.set(key, current);
  }

  type Row = { id: string; news_id: string; user_id: string; body: string; created_at: string; updated_at: string };
  let rows: Row[] = [];
  const byId = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();
  if (viewer.userId) {
    const { data } = await supabase
      .from("news_comments")
      .select("id, news_id, user_id, body, created_at, updated_at")
      .in("news_id", ids)
      .order("created_at", { ascending: true });
    rows = (data ?? []) as Row[];
    const userIds = [...new Set(rows.map((row) => row.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
      : { data: [] };
    for (const p of (profiles ?? []) as { id: string; full_name: string; avatar_url: string | null }[]) {
      byId.set(p.id, p);
    }
  }

  for (const item of news) {
    const reactions = NEWS_REACTION_EMOJIS.map((emoji) => ({
      emoji,
      count: counts.get(`${item.id}|${emoji}`)?.count ?? 0,
      mine: counts.get(`${item.id}|${emoji}`)?.mine ?? false,
    }));
    const comments: NewsCommentView[] = rows
      .filter((row) => row.news_id === item.id)
      .map((row) => {
        const own = row.user_id === viewer.userId;
        return {
          id: row.id,
          userId: row.user_id,
          name: byId.get(row.user_id)?.full_name || "Jugador",
          avatarUrl: byId.get(row.user_id)?.avatar_url ?? null,
          body: row.body,
          createdAt: row.created_at,
          edited: new Date(row.updated_at).getTime() - new Date(row.created_at).getTime() > 1000,
          canEdit: own,
          canDelete: own || viewer.isAdmin || item.isNewsAuthor,
        };
      });
    result.set(item.id, { available: true, comments, reactions });
  }
  return result;
}
