import assert from "node:assert/strict";
import test from "node:test";
import { needsInitialLineupSetup } from "@/lib/live-setup";
import type { MatchLineupEntry } from "@/lib/types";

const match = { home_team_id: "home", away_team_id: "away", current_set: 1 };
const lineup = [{ team_id: "home", is_starter: true, is_libero: false, court_position: 1 } as MatchLineupEntry];

test("un partido privado nuevo pide titulares antes de apuntar", () => {
  assert.equal(needsInitialLineupSetup(match, [], 8, 0, false, false), true);
});

test("no vuelve a pedirla si ya tiene posiciones o estadísticas", () => {
  assert.equal(needsInitialLineupSetup(match, lineup, 8, 0, false, false), false);
  assert.equal(needsInitialLineupSetup(match, [], 8, 0, false, true), false);
});

test("el rival puntual sin plantilla no abre una alineación vacía", () => {
  assert.equal(needsInitialLineupSetup(match, lineup, 8, 0, false, false), false);
});

test("no pide titulares al terminar ni en otro set", () => {
  assert.equal(needsInitialLineupSetup(match, [], 8, 0, true, false), false);
  assert.equal(needsInitialLineupSetup({ ...match, current_set: 2 }, [], 8, 0, false, false), false);
});
