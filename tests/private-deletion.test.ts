import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/051_private_delete_rpc.sql", "utf8");
const actions = readFileSync("lib/actions/private-teams.ts", "utf8");
const controls = readFileSync("components/private-teams/private-delete-controls.tsx", "utf8");

test("all three destructive calls go only through the private RPC entry points", () => {
  assert.ok(actions.includes('rpc("delete_private_team"'));
  assert.ok(actions.includes('rpc("delete_private_match"'));
  assert.ok(actions.includes('rpc("remove_private_player"'));
  assert.ok(!actions.includes('.delete()'));
});
test("private deletion blocks federated/public teams and preserves retired-player events", () => {
  const remove = migration.slice(migration.indexOf("create or replace function public.remove_private_player"), migration.indexOf("create or replace function public.delete_private_team"));
  assert.ok(migration.includes("private.can_write_team"));
  assert.ok(migration.includes("private.can_write_match"));
  assert.ok(migration.includes('is_club_team=false and federation_team_id is null'));
  assert.ok(remove.includes("update public.players set team_id=null"));
  assert.ok(!remove.includes("delete from public.match_events"));
});
test("confirmed destructive dialogs describe match/stat deletion and roster retention", () => {
  assert.ok(controls.includes("Se eliminarán también todos sus partidos privados, alineaciones, acciones y estadísticas."));
  assert.ok(controls.includes("sus sets, alineaciones, acciones y estadísticas"));
  assert.ok(controls.includes("partidos y acciones históricas conservarán su nombre"));
  assert.ok(controls.includes("Eliminar definitivamente"));
});
