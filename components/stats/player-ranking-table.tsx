import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatEfficiency } from "@/lib/stats";
import type { PlayerMatchSample, RankedPlayer } from "@/lib/stats";
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

export function PlayerRankingTable({ players }: { players: RankedPlayer[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-secondary/70 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3 text-left">#</th>
              <th className="px-2 py-3 text-left">Jugador</th>
              <th className="px-2 py-3 text-center">Pts</th>
              <th className="px-2 py-3 text-center">ATK</th>
              <th className="px-2 py-3 text-center">BLO</th>
              <th className="px-2 py-3 text-center">ACE</th>
              <th className="px-2 py-3 text-center">ERR</th>
              <th className="px-2 py-3 text-center">Eff</th>
              <th className="px-2 py-3 text-center">PJ</th>
              <th className="px-3 py-3 text-right">Evolución</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
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
    </div>
  );
}
