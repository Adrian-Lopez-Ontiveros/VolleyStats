import assert from "node:assert/strict";
import test from "node:test";
import { privateLeagueStandings, privateMatchScore } from "@/lib/private-teams";
import { leaguePointsForResult } from "@/lib/stats";
import type { Team, Match, SetScore } from "@/lib/types";

const teams = [
  { id: "a", name: "Alfa", short_name: "ALF", logo_url: null, city: null },
  { id: "b", name: "Beta", short_name: "BET", logo_url: null, city: null },
] as Team[];
const testMatches = new Map<string, number>();
function match(a: number, b: number, extra: Partial<Match> = {}): Match {
  const key = `${a}-${b}-${extra.private_league_id ?? "league"}`;
  const n = (testMatches.get(key) ?? 0) + 1;
  testMatches.set(key, n);
  const scores: SetScore[] = Array.from({ length: a + b }, (_, index) =>
    index < Math.min(a, b) ? { home: 25, away: 23 } :
    index >= a ? { home: 25, away: 15 } : { home: 20, away: 25 }
  );
  return { scheduled_at: `2026-11-0${n}T12:00:00Z`, id: `${a}-${b}-test`, home_team_id: "a", away_team_id: "b", location: null, status: "finished", home_sets: a, away_sets: b, current_set: scores.length, home_points: 0, away_points: 0, set_scores: scores, notes: null, created_by: null, created_at: "", updated_at: "", is_private: true, private_league_id: "league", ...extra };
}

test("3-0 y 3-1 otorgan 3 puntos; 3-2 otorga 2 y 1", () => {
  assert.equal(leaguePointsForResult(3, 0), 3);
  assert.equal(leaguePointsForResult(3, 1), 3);
  assert.equal(leaguePointsForResult(3, 2), 2);
  assert.equal(leaguePointsForResult(2, 3), 1);
  assert.equal(leaguePointsForResult(1, 3), 0);
  assert.equal(leaguePointsForResult(0, 3), 0);
  for (const [a, b, expectedA, expectedB] of [[3,0,3,0],[3,1,3,0],[3,2,2,1],[2,3,1,2],[1,3,0,3],[0,3,0,3]] as const) {
    const isolated = privateLeagueStandings(teams, [match(a, b)]);
    assert.equal(isolated.find((row) => row.team.id === "a")?.leaguePoints, expectedA);
    assert.equal(isolated.find((row) => row.team.id === "b")?.leaguePoints, expectedB);
  }
  const rows = privateLeagueStandings(teams, [match(3, 0), match(3, 1), match(2, 3)]);
  assert.equal(rows.find((row) => row.team.id === "a")?.leaguePoints, 7);
  assert.equal(rows.find((row) => row.team.id === "b")?.leaguePoints, 2);
});

test("empates, incompletos y partidos fuera de liga nunca suman", () => {
  assert.equal(leaguePointsForResult(0, 0), 0);
  assert.equal(leaguePointsForResult(1, 0), 3); // función heredada solo; se filtra antes por resultado de liga
  const data = [match(2, 2), match(2, 1, { status: "scheduled" }), match(3, 0, { is_private: false }), match(3, 0, { private_league_id: null })];
  for (const row of privateLeagueStandings(teams, data)) {
    assert.equal(row.played, 0);
    assert.equal(row.leaguePoints, 0);
  }
  assert.equal(privateLeagueStandings([], []).length, 0);
});

test("resultado manual obliga a un partido completo", () => {
  const base = match(0, 0, { status: "scheduled" });
  const valid = new FormData();
  [[25, 20], [25, 21], [25, 18]].forEach(([h, a], index) => { valid.set(`set${index + 1}Home`, String(h)); valid.set(`set${index + 1}Away`, String(a)); });
  assert.equal(privateMatchScore(valid, base).error, undefined);
  const incomplete = new FormData();
  incomplete.set("set1Home", "25"); incomplete.set("set1Away", "20");
  assert.ok(privateMatchScore(incomplete, base).error);
});
