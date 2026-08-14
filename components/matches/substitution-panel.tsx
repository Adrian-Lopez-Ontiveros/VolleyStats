"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addSubstitution, deleteSubstitution } from "@/lib/actions/matches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatJersey } from "@/lib/utils";
import type { MatchSubstitution, Player } from "@/lib/types";

function playerLabel(player: Pick<Player, "full_name" | "jersey_number">) {
  return `${formatJersey(player.jersey_number)} ${player.full_name}`;
}

export function SubstitutionPanel({
  matchId,
  players,
  onCourtPlayers,
  benchPlayers,
  substitutions,
  canEdit,
}: {
  matchId: string;
  players: Player[];
  onCourtPlayers?: Player[];
  benchPlayers?: Player[];
  substitutions: MatchSubstitution[];
  canEdit: boolean;
}) {
  const outOptions = onCourtPlayers ?? players;
  const inOptions = benchPlayers && benchPlayers.length > 0 ? benchPlayers : players;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await addSubstitution(matchId, formData);
    setPending(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Cambio registrado");
      formRef.current?.reset();
      router.refresh();
    }
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar este cambio?")) return;
    setPending(true);
    const result = await deleteSubstitution(matchId, id);
    setPending(false);
    if (result.error) toast.error(result.error);
    else router.refresh();
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Sustituciones</h2>
        <p className="text-xs text-muted-foreground">
          Quién sale, quién entra y, si lo sabes, el set o el momento.
        </p>
      </div>

      {substitutions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay cambios registrados.</p>
      ) : (
        <ul className="space-y-2">
          {substitutions.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-2xl border bg-card px-3 py-3"
            >
              <div className="min-w-0 text-sm">
                <p className="font-semibold">
                  Sale {item.player_out ? playerLabel(item.player_out) : "jugador"}
                </p>
                <p className="text-muted-foreground">
                  Entra {item.player_in ? playerLabel(item.player_in) : "jugador"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[item.set_number ? `Set ${item.set_number}` : null, item.occurred_at]
                    .filter(Boolean)
                    .join(" · ") || "Sin momento indicado"}
                </p>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => onDelete(item.id)}
                >
                  Quitar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit && benchPlayers && benchPlayers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No queda nadie en el banquillo para entrar.
        </p>
      ) : null}

      {canEdit && outOptions.length > 0 && inOptions.length > 0 && !(benchPlayers && benchPlayers.length === 0) ? (
        <form ref={formRef} action={onSubmit} className="space-y-3 rounded-2xl border bg-card p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="playerOutId">Sale</Label>
              <select
                id="playerOutId"
                name="playerOutId"
                required
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Jugador que sale</option>
                {outOptions.map((player) => (
                  <option key={player.id} value={player.id}>
                    {playerLabel(player)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="playerInId">Entra</Label>
              <select
                id="playerInId"
                name="playerInId"
                required
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Jugador que entra</option>
                {inOptions.map((player) => (
                  <option key={player.id} value={player.id}>
                    {playerLabel(player)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="setNumber">Set</Label>
              <select
                id="setNumber"
                name="setNumber"
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Sin indicar</option>
                {[1, 2, 3, 4, 5].map((setNumber) => (
                  <option key={setNumber} value={setNumber}>
                    Set {setNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="occurredAt">Momento</Label>
              <Input
                id="occurredAt"
                name="occurredAt"
                placeholder="12-10, min. 8..."
              />
            </div>
          </div>
          <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
            {pending ? "Guardando..." : "Registrar cambio"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
