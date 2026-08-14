"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { POSITION_LABELS } from "@/lib/constants";
import { cn, formatJersey } from "@/lib/utils";
import type { MatchLineupEntry, Player } from "@/lib/types";

export function LineupPicker({
  teamId,
  teamName,
  players,
  lineup = [],
}: {
  teamId: string;
  teamName: string;
  players: Player[];
  lineup?: MatchLineupEntry[];
}) {
  const [starters, setStarters] = useState<string[]>(
    lineup.filter((entry) => entry.is_starter).map((entry) => entry.player_id)
  );
  const [liberoId, setLiberoId] = useState(
    lineup.find((entry) => entry.is_libero)?.player_id ?? ""
  );

  function toggleStarter(playerId: string) {
    setStarters((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }
      if (current.length >= 6) return current;
      return [...current, playerId];
    });
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="clubTeamId" value={teamId} />
      {starters.map((id) => (
        <input key={id} type="hidden" name="starterId" value={id} />
      ))}
      {liberoId ? <input type="hidden" name="liberoId" value={liberoId} /> : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Alineación titular</p>
          <p className="text-xs text-muted-foreground">
            {teamName}. Marca hasta 6 titulares y quién es el líbero.
          </p>
        </div>
        <Badge variant="secondary">{starters.length}/6</Badge>
      </div>

      {players.length === 0 ? (
        <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Este equipo todavía no tiene jugadores en la plantilla.
        </p>
      ) : (
        <ul className="space-y-2">
          {players.map((player) => {
            const isStarter = starters.includes(player.id);
            const isLibero = liberoId === player.id;
            return (
              <li
                key={player.id}
                className="rounded-2xl border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">
                      {formatJersey(player.jersey_number)} {player.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {player.position ? POSITION_LABELS[player.position] : "Sin posición"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {isStarter ? <Badge variant="secondary">Titular</Badge> : null}
                    {isLibero ? <Badge variant="accent">Líbero</Badge> : null}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStarter(player.id)}
                    className={cn(
                      "h-10 rounded-xl border text-sm font-semibold",
                      isStarter
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background"
                    )}
                  >
                    Titular
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiberoId((current) => (current === player.id ? "" : player.id))}
                    className={cn(
                      "h-10 rounded-xl border text-sm font-semibold",
                      isLibero
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-input bg-background"
                    )}
                  >
                    Líbero
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
