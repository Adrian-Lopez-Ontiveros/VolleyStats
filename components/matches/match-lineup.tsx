import { Badge } from "@/components/ui/badge";
import { VolleyballCourt } from "@/components/matches/volleyball-court";
import { POSITION_LABELS } from "@/lib/constants";
import {
  LIBERO_KIND_LABEL,
  currentCourtSlots,
  currentLiberoPlayers,
  designatedLiberos,
  isDesignatedLibero,
  lineupHasCourtPositions,
} from "@/lib/court";
import { formatJersey } from "@/lib/utils";
import type { LiberoKind, MatchLineupEntry } from "@/lib/types";

export function MatchLineup({
  teamName,
  entries,
}: {
  teamName: string;
  entries: MatchLineupEntry[];
}) {
  const starters = entries.filter((entry) => entry.is_starter && !isDesignatedLibero(entry));
  const { receptionId, defenseId } = designatedLiberos(entries);
  const reception = entries.find((entry) => entry.player_id === receptionId) ?? null;
  const defense = entries.find((entry) => entry.player_id === defenseId) ?? null;
  const roster = entries
    .map((entry) => entry.player)
    .filter((player): player is NonNullable<typeof player> => Boolean(player));
  const showCourt = lineupHasCourtPositions(entries);
  const courtSlots = showCourt ? currentCourtSlots(entries, [], roster, 1) : {};
  const pair = showCourt ? currentLiberoPlayers(entries, [], roster) : null;

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
        <VolleyballCourt
          slots={courtSlots}
          liberos={{
            reception: pair?.reception ?? null,
            defense: pair?.defense ?? null,
            activeKind: pair?.activeKind ?? null,
          }}
        />
      ) : (
        <ul className="space-y-2">
          {starters.map((entry) => (
            <LineupRow key={entry.id} entry={entry} tag="Titular" />
          ))}
          {reception ? (
            <LineupRow
              key={`${reception.id}-reception`}
              entry={reception}
              tag={liberoTag("reception", receptionId === defenseId)}
            />
          ) : null}
          {defense && defenseId !== receptionId ? (
            <LineupRow key={`${defense.id}-defense`} entry={defense} tag={liberoTag("defense", false)} />
          ) : null}
        </ul>
      )}
    </section>
  );
}

function liberoTag(kind: LiberoKind, both: boolean) {
  if (both) return "Líbero recepción y defensa";
  return `Líbero ${LIBERO_KIND_LABEL[kind].toLowerCase()}`;
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
      <Badge variant={tag.startsWith("Líbero") ? "accent" : "secondary"}>{tag}</Badge>
    </li>
  );
}
