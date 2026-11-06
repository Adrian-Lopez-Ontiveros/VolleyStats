import assert from "node:assert/strict";
import test from "node:test";
import { playerUpdateSucceeded } from "@/lib/player-write";

const playerId = "11111111-1111-1111-1111-111111111111";

test("confirma una posición añadida a un jugador que no la tenía", () => {
  assert.equal(playerUpdateSucceeded({ id: playerId, position: "central" }, playerId, "central"), true);
});

test("confirma cambiar y borrar una posición existente", () => {
  assert.equal(playerUpdateSucceeded({ id: playerId, position: "libero" }, playerId, "libero"), true);
  assert.equal(playerUpdateSucceeded({ id: playerId, position: null }, playerId, null), true);
});

test("no confirma una escritura bloqueada silenciosamente por RLS", () => {
  assert.equal(playerUpdateSucceeded(null, playerId, "central"), false);
});

test("no confirma una fila distinta ni un valor que no se haya guardado", () => {
  assert.equal(playerUpdateSucceeded({ id: "otro-id", position: "central" }, playerId, "central"), false);
  assert.equal(playerUpdateSucceeded({ id: playerId, position: null }, playerId, "central"), false);
});
