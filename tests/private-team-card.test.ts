import assert from "node:assert/strict";
import test from "node:test";
import { matchSummary } from "@/components/private-teams/private-team-card";
import { readFileSync } from "node:fs";

const teams = [{ id: "equipo", name: "Prueba 1" }, { id: "rival", name: "Los Muñones" }];
const match = (status: string, scheduled_at: string) => ({
  status, scheduled_at, home_team_id: "equipo", away_team_id: "rival",
});
const now = new Date("2026-11-06T16:00:00Z");

test("private cards show the next scheduled match", () => {
  assert.deepEqual(
    matchSummary([match("scheduled", "2026-11-08T10:00:00Z")], "equipo", teams, now),
    { matchLabel: "Próximo partido", summary: "Los Muñones · 8 nov, 11:00" },
  );
});

test("a live match takes priority over scheduled matches, and empty teams have a quiet state", () => {
  assert.equal(matchSummary([
    match("scheduled", "2026-11-08T10:00:00Z"), match("live", "2026-11-06T15:00:00Z"),
  ], "equipo", teams, now).matchLabel, "En juego");
  assert.equal(matchSummary([], "equipo", teams, now).summary, "Tu cuenta de voleibol, a tu manera.");
});

test("the team card uses the existing theme tokens and a light-aware footer in both themes", () => {
  const source = readFileSync("components/private-teams/private-team-card.tsx", "utf8");
  assert.ok(source.includes('className="flex w-full items-center justify-center gap-2 rounded-b-2xl bg-primary'));
  assert.ok(!source.includes("hsl(var(--muted-foreground)/0.5)"));
});

test("the private-team overview only adds player, match and opponent reads", () => {
  const source = readFileSync("lib/private-teams-data.ts", "utf8");
  assert.ok(source.includes('from("matches")'));
  assert.ok(!source.includes("delete("));
});
