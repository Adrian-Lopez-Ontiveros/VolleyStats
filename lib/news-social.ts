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
  const reactionsQuery = await supabase
    .from("news_reactions")
    .select("emoji, user_id")
    .eq("news_id", newsId);
  if (reactionsQuery.error) return { available: false, comments: [], reactions: [] };

  const counts = new Map<string, { count: number; mine: boolean }>();
  for (const row of (reactionsQuery.data ?? []) as { emoji: string; user_id: string }[]) {
    const current = counts.get(row.emoji) ?? { count: 0, mine: false };
    current.count += 1;
    if (row.user_id === viewer.userId) current.mine = true;
    counts.set(row.emoji, current);
  }
  const reactions = NEWS_REACTION_EMOJIS.map((emoji) => ({
    emoji,
    count: counts.get(emoji)?.count ?? 0,
    mine: counts.get(emoji)?.mine ?? false,
  }));

  let comments: NewsCommentView[] = [];
  if (viewer.userId) {
    const { data } = await supabase
      .from("news_comments")
      .select("id, user_id, body, created_at, updated_at")
      .eq("news_id", newsId)
      .order("created_at", { ascending: true });
    const rows = (data ?? []) as {
      id: string;
      user_id: string;
      body: string;
      created_at: string;
      updated_at: string;
    }[];
    const ids = [...new Set(rows.map((row) => row.user_id))];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids)
      : { data: [] };
    const byId = new Map(
      ((profiles ?? []) as { id: string; full_name: string; avatar_url: string | null }[]).map((p) => [p.id, p])
    );
    comments = rows.map((row) => {
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
        canDelete: own || viewer.isAdmin || viewer.isNewsAuthor,
      };
    });
  }

  return { available: true, comments, reactions };
}
