import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { visiblePrivateActionError } from "@/lib/private-action-error";

const read = (path: string) => readFileSync(path, "utf8");

test("admin sees the original RLS technical error, another coach gets a useful safe message", () => {
  const error = 'new row violates row-level security policy for table "private_leagues"';
  assert.deepEqual(visiblePrivateActionError(error, true), {
    error: "La base de datos ha rechazado la operación por permisos de acceso.",
    errorDetail: `Detalle de Supabase: ${error}`,
  });
  assert.equal(visiblePrivateActionError(error, false).errorDetail, undefined);
});

test("team creation uses one RPC and still normalizes optional short name", () => {
  const action = read("lib/actions/private-teams.ts");
  assert.ok(action.includes('rpc("create_private_team_container"'));
  assert.ok(action.includes("parsed.data.shortName || null"));
  assert.ok(!action.includes('from("private_leagues").insert'));
});
