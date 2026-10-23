"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FramedAvatar } from "@/components/game/framed-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  addNewsComment,
  deleteNewsComment,
  toggleNewsReaction,
  updateNewsComment,
} from "@/lib/actions/news-social";
import type { NewsSocialData } from "@/lib/news-social";
import { cn } from "@/lib/utils";

export function NewsReactionsBar({
  newsId,
  reactions,
  canReact,
  compact = false,
}: {
  newsId: string;
  reactions: NewsSocialData["reactions"];
  canReact: boolean;
  compact?: boolean;
}) {
  const [items, setItems] = useState(reactions);
  const [, startTransition] = useTransition();

  function toggle(emoji: string) {
    if (!canReact) {
      toast.info("Inicia sesión para reaccionar");
      return;
    }
    const target = items.find((item) => item.emoji === emoji);
    if (!target) return;
    const on = !target.mine;
    const previous = items;
    setItems((current) =>
      current.map((item) =>
        item.emoji === emoji ? { ...item, mine: on, count: Math.max(0, item.count + (on ? 1 : -1)) } : item
      )
    );
    startTransition(async () => {
      const result = await toggleNewsReaction(newsId, emoji, on);
      if (result?.error) {
        setItems(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className={cn("flex flex-wrap", compact ? "gap-1" : "gap-2")} aria-label="Reacciones">
      {items.map((item) => (
        <button
          key={item.emoji}
          type="button"
          onClick={() => toggle(item.emoji)}
          aria-pressed={item.mine}
          className={cn(
            "inline-flex items-center rounded-full border bg-card font-semibold tabular-nums shadow-card transition-colors",
            compact ? "h-8 gap-1 px-2 text-xs" : "h-9 gap-1.5 px-3 text-sm",
            item.mine
              ? "border-primary/60 bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className={cn("leading-none", compact ? "text-sm" : "text-base")}>{item.emoji}</span>
          {item.count > 0 ? <span>{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function NewsComments({
  newsId,
  comments,
  loggedIn,
}: {
  newsId: string;
  comments: NewsSocialData["comments"];
  loggedIn: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pending, startTransition] = useTransition();

  if (!loggedIn) {
    return (
      <p className="rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Link href="/login" className="font-semibold text-primary underline-offset-2 hover:underline">
          Inicia sesión
        </Link>{" "}
        para leer y escribir comentarios.
      </p>
    );
  }

  function submit() {
    const text = draft.trim();
    if (!text) return;
    startTransition(async () => {
      const result = await addNewsComment(newsId, text);
      if (result?.error) toast.error(result.error);
      else setDraft("");
    });
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      const result = await updateNewsComment(newsId, id, editDraft);
      if (result?.error) toast.error(result.error);
      else setEditing(null);
    });
  }

  function remove(id: string) {
    if (!window.confirm("¿Borrar este comentario?")) return;
    startTransition(async () => {
      const result = await deleteNewsComment(newsId, id);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sé el primero en comentar.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3 rounded-2xl border bg-card px-3 py-3 shadow-card">
              <FramedAvatar name={comment.name} url={comment.avatarUrl} frameId={null} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{comment.name}</p>
                  <p className="shrink-0 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { locale: es, addSuffix: true })}
                    {comment.edited ? " · editado" : ""}
                  </p>
                </div>
                {editing === comment.id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      maxLength={1000}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={pending} onClick={() => saveEdit(comment.id)}>
                        Guardar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
                    {comment.body}
                  </p>
                )}
                {(comment.canEdit || comment.canDelete) && editing !== comment.id ? (
                  <div className="mt-1.5 flex gap-3 text-xs font-medium text-muted-foreground">
                    {comment.canEdit ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() => {
                          setEditing(comment.id);
                          setEditDraft(comment.body);
                        }}
                      >
                        <Pencil className="h-3 w-3" /> Editar
                      </button>
                    ) : null}
                    {comment.canDelete ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-destructive"
                        disabled={pending}
                        onClick={() => remove(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" /> Borrar
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escribe un comentario…"
          maxLength={1000}
          rows={3}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground tabular-nums">{draft.length}/1000</span>
          <Button size="sm" disabled={pending || draft.trim().length === 0} onClick={submit}>
            <MessageCircle className="h-4 w-4" />
            Comentar
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Reacciones + comentarios desplegables en las tarjetas del listado de /noticias. */
export function NewsCardSocial({
  newsId,
  social,
  loggedIn,
}: {
  newsId: string;
  social: NewsSocialData;
  loggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = social.comments.length;
  return (
    <div className="space-y-3 border-t px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <NewsReactionsBar newsId={newsId} reactions={social.reactions} canReact={loggedIn} compact />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors",
            open ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageCircle className="h-4 w-4" />
          {loggedIn ? (count > 0 ? `${count} ${count === 1 ? "comentario" : "comentarios"}` : "Comentar") : "Comentarios"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open ? <NewsComments newsId={newsId} comments={social.comments} loggedIn={loggedIn} /> : null}
    </div>
  );
}
