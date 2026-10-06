"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatEfficiency } from "@/lib/stats";
import type { PlayerMatchSample, RankedPlayer } from "@/lib/stats";
import { formatAttackEfficiency } from "@/lib/volleyball-stats";
import { formatJersey, initials } from "@/lib/utils";

function PlayerSparkline({ data }: { data: PlayerMatchSample[] }) {
  if (data.length < 2) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }

  const values = data.map((item) => item.points);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 80;
      const y = 28 - ((value - min) / span) * 24;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 80 32" className="h-8 w-20" aria-hidden>
      <polyline
        fill="none"
        stroke="#C4B5FD"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

type SortKey =
  | "points"
  | "attack_points"
  | "block_points"
  | "aces"
  | "errors"
  | "efficiency"
  | "attackEfficiency"
  | "matches_played";

const EFF_TITLE = "Eff: (puntos − errores) / (puntos + errores)";
const ATK_TITLE = "Puntos y continuaciones de ataque sobre los intentos";

function sortValue(player: RankedPlayer, key: SortKey): number | null {
  if (key === "attackEfficiency") return player.attackEfficiency;
  return player[key];
}

function SortHeader({
  label,
  sortKey,
  active,
  direction,
  onSort,
  title,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey | null;
  direction: "asc" | "desc";
  onSort: (key: SortKey) => void;
  title?: string;
}) {
  const pressed = active === sortKey;
  return (
    <th className="px-2 py-3 text-center" aria-sort={pressed ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        title={title}
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground"
      >
        {label}
        <span className="text-[10px]" aria-hidden>
          {pressed ? (direction === "desc" ? "▼" : "▲") : ""}
        </span>
      </button>
    </th>
  );
}

export function PlayerRankingTable({ players }: { players: RankedPlayer[] }) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  function onSort(key: SortKey) {
    if (sortKey === key) {
      setDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setDirection("desc");
  }

  const rows = useMemo(() => {
    if (!sortKey) return players;
    const sign = direction === "asc" ? 1 : -1;
    return [...players].sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);
      if (left === null && right === null) return a.full_name.localeCompare(b.full_name, "es");
      if (left === null) return 1;
      if (right === null) return -1;
      if (left !== right) return (left - right) * sign;
      return a.full_name.localeCompare(b.full_name, "es");
    });
  }, [players, sortKey, direction]);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-secondary/70 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3 text-left">#</th>
              <th className="px-2 py-3 text-left">Jugador</th>
              <SortHeader label="Pts" sortKey="points" active={sortKey} direction={direction} onSort={onSort} />
              <SortHeader label="ATK" sortKey="attack_points" active={sortKey} direction={direction} onSort={onSort} />
              <SortHeader label="BLO" sortKey="block_points" active={sortKey} direction={direction} onSort={onSort} />
              <SortHeader label="ACE" sortKey="aces" active={sortKey} direction={direction} onSort={onSort} />
              <SortHeader label="ERR" sortKey="errors" active={sortKey} direction={direction} onSort={onSort} />
              <SortHeader
                label="Eff"
                sortKey="efficiency"
                active={sortKey}
                direction={direction}
                onSort={onSort}
                title={EFF_TITLE}
              />
              <SortHeader
                label="ATK%"
                sortKey="attackEfficiency"
                active={sortKey}
                direction={direction}
                onSort={onSort}
                title={ATK_TITLE}
              />
              <SortHeader label="PJ" sortKey="matches_played" active={sortKey} direction={direction} onSort={onSort} />
              <th className="px-3 py-3 text-right">Evolución</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((player, index) => (
              <tr key={player.id} className="border-b last:border-0 even:bg-secondary/20">
                <td className="px-3 py-2.5 text-center font-bold tabular-nums">{index + 1}</td>
                <td className="px-2 py-2.5">
                  <Link href={`/jugadores/${player.id}`} className="flex items-center gap-2 hover:underline">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={player.avatar_url ?? undefined} alt={player.full_name} />
                      <AvatarFallback>{initials(player.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {formatJersey(player.jersey_number)} {player.full_name}
                    </span>
                  </Link>
                </td>
                <td className="px-2 py-2.5 text-center font-bold tabular-nums">{player.points}</td>
                <td className="px-2 py-2.5 text-center tabular-nums">{player.attack_points}</td>
                <td className="px-2 py-2.5 text-center tabular-nums">{player.block_points}</td>
                <td className="px-2 py-2.5 text-center tabular-nums">{player.aces}</td>
                <td className="px-2 py-2.5 text-center tabular-nums">{player.errors}</td>
                <td className="px-2 py-2.5 text-center font-semibold tabular-nums">
                  {formatEfficiency(player.efficiency)}
                </td>
                <td className="px-2 py-2.5 text-center font-semibold tabular-nums">
                  {formatAttackEfficiency(player.attackEfficiency)}
                </td>
                <td className="px-2 py-2.5 text-center tabular-nums">{player.matches_played}</td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end">
                    <PlayerSparkline data={player.series} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        Eff es (puntos − errores) dividido entre (puntos + errores). ATK% es los puntos y las continuaciones de ataque sobre los intentos.
      </p>
    </div>
  );
}
