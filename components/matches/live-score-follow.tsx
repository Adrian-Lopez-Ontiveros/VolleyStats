"use client";

import { useMemo } from "react";
import { PlayByPlay } from "@/components/matches/play-by-play";
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
      <PlayByPlay
        events={liveEvents}
        homeTeamId={match.home_team_id}
        homeTeam={match.home_team}
        awayTeam={match.away_team}
      />
    </div>
  );
}
