"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createTraining, updateTraining } from "@/lib/actions/trainings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toLocalDateTimeInput } from "@/lib/utils";
import type { Team, Training } from "@/lib/types";

export function TrainingForm({
  training,
  teams,
}: {
  training?: Training;
  teams: Team[];
}) {
  const [pending, setPending] = useState(false);
  const clubTeams = teams.filter((team) => team.is_club_team);
  const options = clubTeams.length > 0 ? clubTeams : teams;

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = training
      ? await updateTraining(training.id, formData)
      : await createTraining(formData);
    setPending(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={80}
          defaultValue={training?.name ?? ""}
          placeholder="Bloqueo y recepción"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scheduledAt">Fecha y hora</Label>
        <Input
          id="scheduledAt"
          name="scheduledAt"
          type="datetime-local"
          required
          defaultValue={toLocalDateTimeInput(training?.scheduled_at ?? new Date())}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="teamId">Equipo</Label>
        <select
          id="teamId"
          name="teamId"
          defaultValue={training?.team_id ?? ""}
          className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
        >
          <option value="">Sin equipo concreto</option>
          {options.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={training?.notes ?? ""}
          placeholder="Objetivos, ejercicios, observaciones…"
        />
      </div>

      <Button type="submit" variant="accent" className="w-full" disabled={pending}>
        {pending
          ? "Guardando..."
          : training
            ? "Guardar cambios"
            : "Crear entrenamiento"}
      </Button>
    </form>
  );
}
