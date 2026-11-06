import test from "node:test";
import assert from "node:assert/strict";
import { privatePlayerStats } from "@/lib/private-teams";

test("las estadísticas privadas separan puntos y errores por tipo", () => {
  const stats = privatePlayerStats([
    { point_type: "attack" }, { point_type: "block" }, { point_type: "ace" },
    { point_type: "attack_error" }, { point_type: "serve_error" }, { point_type: "reception_error" },
    { point_type: "defense_error" }, { point_type: "serve_in" }, { point_type: "reception_good" },
  ]);
  assert.equal(stats.points, 3);
  assert.equal(stats.attackPoints, 1);
  assert.equal(stats.blockPoints, 1);
  assert.equal(stats.aces, 1);
  assert.equal(stats.errors, 4);
  assert.equal(stats.attackKills, 1);
  assert.equal(stats.attackErrors, 1);
  assert.equal(stats.serveErrors, 1);
  assert.equal(stats.receptionErrors, 1);
  assert.equal(stats.defenseErrors, 1);
  assert.equal(stats.serveIn, 1);
  assert.equal(stats.receptionGood, 1);
});

test("las estadísticas privadas vacías son cero", () => {
  const stats = privatePlayerStats([]);
  assert.equal(stats.points, 0);
  assert.equal(stats.errors, 0);
});
