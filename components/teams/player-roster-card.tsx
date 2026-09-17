"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { setPlayerJersey } from "@/lib/actions/players";
import { POSITION_LABELS } from "@/lib/constants";
import { initials } from "@/lib/utils";
import type { Player } from "@/lib/types";

export function PlayerRosterCard({
  player,
  href,
  canEditJersey,
  subtitle,
}: {
  player: Pick<Player, "id" | "full_name" | "jersey_number" | "position" | "avatar_url">;
  href: string;
  canEditJersey: boolean;
  subtitle?: string;
}) {
  const [jersey, setJersey] = useState(player.jersey_number);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player.jersey_number != null ? String(player.jersey_number) : "");
  const [pending, startTransition] = useTransition();

  function save() {
    if (pending) return;
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next !== null && (!Number.isInteger(next) || next < 0 || next > 99)) {
      toast.error("El dorsal debe estar entre 0 y 99");
      return;
    }
    startTransition(async () => {
      const result = await setPlayerJersey(player.id, next);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setJersey(next);
      setEditing(false);
      if (result.xpGained > 0) {
        toast.success(`Dorsal guardado · +${result.xpGained} XP`);
        if (result.leveledUp && result.level) {
          toast.success(`¡Subes a nivel ${result.level}!`);
        }
      } else {
        toast.success("Dorsal guardado");
      }
    });
  }

  return (
    <Card className="h-full transition-transform active:scale-[0.99]">
      <CardContent className="flex items-center gap-3 p-4">
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={player.avatar_url ?? undefined} alt={player.full_name} />
            <AvatarFallback>{initials(player.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{player.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {subtitle ??
                (player.position ? POSITION_LABELS[player.position] : "Jugador")}
            </p>
          </div>
        </Link>
        {editing ? (
          <form
            className="flex w-16 flex-col items-center gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <Input
              autoFocus
              inputMode="numeric"
              min={0}
              max={99}
              value={draft}
              disabled={pending}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => {
                if (!pending) save();
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setDraft(jersey != null ? String(jersey) : "");
                  setEditing(false);
                }
              }}
              className="h-12 w-16 px-1 text-center text-lg font-black tabular-nums"
              aria-label={`Dorsal de ${player.full_name}`}
            />
            <span className="text-[10px] text-muted-foreground">dorsal</span>
          </form>
        ) : (
          <button
            type="button"
            disabled={!canEditJersey}
            onClick={() => {
              if (!canEditJersey) return;
              setDraft(jersey != null ? String(jersey) : "");
              setEditing(true);
            }}
            className="flex h-12 w-16 flex-col items-center justify-center rounded-xl bg-secondary px-1 disabled:cursor-default"
            aria-label={
              canEditJersey
                ? `Editar dorsal de ${player.full_name}`
                : `Dorsal ${jersey ?? "sin asignar"}`
            }
          >
            <span className="text-lg font-black tabular-nums leading-none">
              {jersey ?? "—"}
            </span>
            <span className="mt-0.5 text-[10px] text-muted-foreground">dorsal</span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}
