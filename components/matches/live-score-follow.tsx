"use client";

import { useMemo } from "react";
import { PointHistory } from "@/components/matches/point-history";
import { Scoreboard } from "@/components/matches/scoreboard";
import { useLiveMatchEvents } from "@/components/matches/use-live-match-events";
import { computeMatchState } from "@/lib/volleyball";
import type { MatchEventWithPlayer, MatchWithTeams } from "@/lib/types";

export function LiveScoreFollow({
  match,
  events,
}: {
  match: MatchWithTeams;
  events: MatchEventWithPlayer[];
}) {
  const { events: liveEvents } = useLiveMatchEvents({
    matchId: match.id,
    initialEvents: events,
    initialSubstitutions: [],
    initialLineup: [],
    players: [],
  });
  const displayMatch = useMemo(() => {
    const computed = computeMatchState(liveEvents, match.home_team_id, match.status);
    return {
      ...match,
      home_sets: computed.homeSets,
      away_sets: computed.awaySets,
      current_set: computed.currentSet,
      home_points: computed.homePoints,
      away_points: computed.awayPoints,
      set_scores: computed.setScores,
      status:
        computed.status === "finished"
          ? ("finished" as const)
          : liveEvents.some((event) => event.scoring_team_id)
            ? ("live" as const)
            : match.status,
    };
  }, [liveEvents, match]);

  return (
    <div className="space-y-4">
      <Scoreboard match={displayMatch} />
      <section>
        <h2 className="mb-3 text-lg font-semibold">Punto a punto</h2>
        <PointHistory
          events={liveEvents}
          homeTeamId={match.home_team_id}
          homeTeamName={match.home_team.short_name || match.home_team.name}
          awayTeamName={match.away_team.short_name || match.away_team.name}
          playByPlay
        />
      </section>
    </div>
  );
}
