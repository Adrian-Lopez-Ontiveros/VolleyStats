import { Badge } from "@/components/ui/badge";
import { VolleyballCourt } from "@/components/matches/volleyball-court";
import { POSITION_LABELS } from "@/lib/constants";
import {
  currentCourtSlots,
  currentLiberoPlayer,
  liberoOffCourt,
  lineupHasCourtPositions,
} from "@/lib/court";
import { formatJersey } from "@/lib/utils";
import type { MatchLineupEntry } from "@/lib/types";

export function MatchLineup({
  teamName,
  entries,
}: {
  teamName: string;
  entries: MatchLineupEntry[];
}) {
  const starters = entries.filter((entry) => entry.is_starter && !entry.is_libero);
  const libero = entries.find((entry) => entry.is_libero) ?? null;
  const roster = entries
    .map((entry) => entry.player)
    .filter((player): player is NonNullable<typeof player> => Boolean(player));
  const showCourt = lineupHasCourtPositions(entries);
  const courtSlots = showCourt ? currentCourtSlots(entries, [], roster, 1) : {};
  const courtLibero = showCourt
    ? liberoOffCourt(currentLiberoPlayer(entries, [], roster), courtSlots)
    : null;

  if (entries.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold">Alineación titular</h2>
        <p className="text-sm text-muted-foreground">
          Todavía no hay alineación de {teamName} para este partido.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Alineación titular</h2>
      <p className="mb-3 text-xs text-muted-foreground">{teamName} · rotación 1</p>
      {showCourt ? (
        <VolleyballCourt slots={courtSlots} libero={courtLibero} />
      ) : (
        <ul className="space-y-2">
          {starters.map((entry) => (
            <LineupRow key={entry.id} entry={entry} tag="Titular" />
          ))}
          {libero ? <LineupRow key={libero.id} entry={libero} tag="Líbero" /> : null}
        </ul>
      )}
    </section>
  );
}

function LineupRow({
  entry,
  tag,
}: {
  entry: MatchLineupEntry;
  tag: string;
}) {
  const player = entry.player;
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-3 py-3">
      <div className="min-w-0">
        <p className="font-semibold">
          {formatJersey(player?.jersey_number)} {player?.full_name ?? "Jugador"}
        </p>
        <p className="text-xs text-muted-foreground">
          {player?.position ? POSITION_LABELS[player.position] : "Sin posición"}
        </p>
      </div>
      <Badge variant={tag === "Líbero" ? "accent" : "secondary"}>{tag}</Badge>
    </li>
  );
}
