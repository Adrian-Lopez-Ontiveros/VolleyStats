import assert from "node:assert/strict";
import { test } from "node:test";
import { inferNextRotations, inferNextServer, inferRallyState, storedRotationFromZone } from "@/lib/volleyball-stats";

const H = "home";
const A = "away";
let t = 0;
function ev(e: Partial<{ point_type: string; scoring_team_id: string | null; serving_team_id: string | null; home_rotation: number | null; away_rotation: number | null; set_number: number }>) {
  t += 1000;
  return {
    point_type: "serve_in",
    scoring_team_id: null,
    set_number: 1,
    created_at: new Date(t).toISOString(),
    ...e,
  } as Parameters<typeof inferRallyState>[0][number];
}

test("set 1 sin acciones respeta el inicio elegido", () => {
  const s = inferRallyState([], H, A, 1, undefined, { servingTeamId: A, homeRotation: 4, awayRotation: 3 });
  assert.equal(s.servingTeamId, A);
  assert.equal(s.home, 4);
  assert.equal(s.away, 3);
});

test("la primera acción sin punto no cambia saque ni rotación", () => {
  const start = { servingTeamId: A, homeRotation: 4, awayRotation: 3 };
  const events = [
    ev({ point_type: "serve_in", serving_team_id: A, home_rotation: storedRotationFromZone(4), away_rotation: storedRotationFromZone(3) }),
    ev({ point_type: "reception", serving_team_id: A, home_rotation: storedRotationFromZone(4), away_rotation: storedRotationFromZone(3) }),
  ];
  assert.equal(inferNextServer(events, H, A, 1, start), A);
  assert.deepEqual(inferNextRotations(events, H, A, 1, undefined, start), { home: 4, away: 3 });
  // Incluso sin el inicio guardado en el dispositivo, las acciones lo conservan.
  assert.equal(inferNextServer(events, H, A, 1), A);
  assert.deepEqual(inferNextRotations(events, H, A, 1), { home: 4, away: 3 });
});

test("solo rota el equipo que hace side-out", () => {
  const start = { servingTeamId: A, homeRotation: 1, awayRotation: 1 };
  const r = (h: number, a: number) => ({ home_rotation: storedRotationFromZone(h), away_rotation: storedRotationFromZone(a) });
  const events = [
    ev({ serving_team_id: A, ...r(1, 1) }),
    ev({ point_type: "attack_point", scoring_team_id: H, serving_team_id: A, ...r(1, 1) }), // side-out local
  ];
  let s = inferRallyState(events, H, A, 1, undefined, start);
  assert.deepEqual([s.servingTeamId, s.home, s.away], [H, 6, 1]);
  events.push(ev({ point_type: "ace", scoring_team_id: H, serving_team_id: H, ...r(6, 1) })); // break point: no rota
  s = inferRallyState(events, H, A, 1, undefined, start);
  assert.deepEqual([s.servingTeamId, s.home, s.away], [H, 6, 1]);
  events.push(ev({ point_type: "attack_point", scoring_team_id: A, serving_team_id: H, ...r(6, 1) }));
  s = inferRallyState(events, H, A, 1, undefined, start);
  assert.deepEqual([s.servingTeamId, s.home, s.away], [A, 6, 6]);
});

test("el set nuevo no hereda el estado del anterior", () => {
  const events = [ev({ point_type: "ace", scoring_team_id: H, serving_team_id: H, home_rotation: 3, away_rotation: 5 })];
  const s = inferRallyState(events, H, A, 2, undefined, { servingTeamId: H, homeRotation: 2, awayRotation: 5 });
  assert.deepEqual([s.servingTeamId, s.home, s.away], [H, 2, 5]);
  const d = inferRallyState(events, H, A, 2);
  assert.deepEqual([d.servingTeamId, d.home, d.away], [A, 1, 1]);
});

test("rotación relativa a la colocadora", () => {
  const starts = { homeSetterStart: 4 };
  const events = [ev({ serving_team_id: H, home_rotation: storedRotationFromZone(3, 4), away_rotation: 1 })];
  assert.equal(inferNextRotations(events, H, A, 1, starts).home, 3);
});
