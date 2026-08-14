"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTeam, updateTeam } from "@/lib/actions/teams";
import { TEAM_CATEGORIES, getCategoryMeta, type TeamCategory } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TeamLogoUpload } from "@/components/teams/team-logo-upload";
import type { Team } from "@/lib/types";

export function TeamForm({
  team,
  defaultCategory,
  defaultIsClub = false,
  lockKind = false,
}: {
  team?: Team;
  defaultCategory?: TeamCategory;
  defaultIsClub?: boolean;
  lockKind?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const category = team?.category ?? defaultCategory ?? TEAM_CATEGORIES[0].id;
  const isClub = team?.is_club_team ?? defaultIsClub;
  const categoryMeta = getCategoryMeta(category);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = team
      ? await updateTeam(team.id, formData)
      : await createTeam(formData);
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
    }
  }

  return (
    <form action={onSubmit} className="space-y-4">
      {team ? (
        <TeamLogoUpload
          teamId={team.id}
          name={team.name}
          shortName={team.short_name}
          url={team.logo_url}
        />
      ) : (
        <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Después de crear el equipo podrás subir su escudo desde la ficha de edición.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del equipo</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={team?.name ?? (isClub ? categoryMeta.clubName : "")}
          placeholder={isClub ? categoryMeta.clubName : "CV Atlántico"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Categoría / liga</Label>
        <select
          id="category"
          name="category"
          required
          defaultValue={category}
          className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
        >
          {TEAM_CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      {lockKind ? (
        <input type="hidden" name="isClub" value={isClub ? "true" : "false"} />
      ) : (
        <label className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
          <input
            type="checkbox"
            name="isClub"
            value="true"
            defaultChecked={isClub}
            className="h-4 w-4 rounded border-input"
          />
          Equipo del club (CV Fuenlabrada)
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="shortName">Abreviatura</Label>
          <Input
            id="shortName"
            name="shortName"
            maxLength={8}
            defaultValue={team?.short_name ?? (isClub ? categoryMeta.clubShort : "")}
            placeholder={isClub ? categoryMeta.clubShort : "ATL"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Ciudad</Label>
          <Input
            id="city"
            name="city"
            defaultValue={team?.city ?? (isClub ? "Fuenlabrada" : "")}
            placeholder={isClub ? "Fuenlabrada" : "Valencia"}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" className="flex-1" disabled={pending}>
          {pending ? "Guardando..." : team ? "Guardar cambios" : "Crear equipo"}
        </Button>
      </div>
    </form>
  );
}
