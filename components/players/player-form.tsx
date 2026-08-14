"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPlayer, updatePlayer } from "@/lib/actions/players";
import { POSITION_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Player, Team } from "@/lib/types";

export function PlayerForm({
  player,
  teams,
  defaultTeamId,
}: {
  player?: Player;
  teams: Team[];
  defaultTeamId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = player
      ? await updatePlayer(player.id, formData)
      : await createPlayer(formData);
    setPending(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Nombre y apellido</Label>
        <Input
          id="fullName"
          name="fullName"
          required
          defaultValue={player?.full_name}
          placeholder="Luis Pérez"
        />
        <p className="text-xs text-muted-foreground">
          Usa nombre y apellido como en el registro (por ejemplo «Ismael Bernal»).
          Se ignoran mayúsculas y espacios extra al vincular la cuenta.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="jerseyNumber">Dorsal</Label>
          <Input
            id="jerseyNumber"
            name="jerseyNumber"
            type="number"
            min={0}
            max={99}
            defaultValue={player?.jersey_number ?? ""}
            placeholder="7"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Posición</Label>
          <select
            id="position"
            name="position"
            defaultValue={player?.position ?? ""}
            className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
          >
            <option value="">Sin definir</option>
            {Object.entries(POSITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="teamId">Equipo</Label>
        <select
          id="teamId"
          name="teamId"
          defaultValue={player?.team_id ?? defaultTeamId ?? ""}
          className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
        >
          <option value="">Sin equipo</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" className="flex-1" disabled={pending}>
          {pending ? "Guardando..." : player ? "Guardar cambios" : "Crear jugador"}
        </Button>
      </div>
    </form>
  );
}
