"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setUserCoachedTeam, setUserRole } from "@/lib/actions/admin";
import { ROLE_LABELS } from "@/lib/constants";
import type { Team, UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["player", "coach", "admin"];

export function RoleSelect({
  userId,
  role,
  coachedTeamId = null,
  playingTeamName = null,
  clubTeams = [],
  disabled,
}: {
  userId: string;
  role: UserRole;
  coachedTeamId?: string | null;
  playingTeamName?: string | null;
  clubTeams?: Pick<Team, "id" | "name" | "short_name">[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const showCoachTeam = role === "coach" || role === "admin";

  function onRoleChange(next: UserRole) {
    if (next === role) return;
    startTransition(async () => {
      const result = await setUserRole(
        userId,
        next,
        next === "player" ? null : coachedTeamId
      );
      if (result.error) toast.error(result.error);
      else {
        toast.success(`Rol actualizado a ${ROLE_LABELS[next].toLowerCase()}`);
        router.refresh();
      }
    });
  }

  function onTeamChange(next: string) {
    startTransition(async () => {
      const result = await setUserCoachedTeam(userId, next || null);
      if (result.error) toast.error(result.error);
      else {
        toast.success(next ? "Equipo que entrena actualizado" : "Sin equipo de entrenador");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-col items-stretch gap-2 sm:items-end">
      {playingTeamName ? (
        <p className="text-[11px] text-muted-foreground">Juega en {playingTeamName}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">Sin ficha de jugadora</p>
      )}
      <select
        value={role}
        disabled={disabled || pending}
        aria-label="Rol del usuario"
        onChange={(event) => onRoleChange(event.target.value as UserRole)}
        className="h-9 max-w-[12rem] rounded-lg border border-input bg-card px-2 text-xs font-medium shadow-sm disabled:opacity-60"
      >
        {ROLES.map((item) => (
          <option key={item} value={item}>
            {ROLE_LABELS[item]}
          </option>
        ))}
      </select>
      {showCoachTeam ? (
        <select
          value={coachedTeamId ?? ""}
          disabled={disabled || pending}
          aria-label="Equipo que entrena"
          onChange={(event) => onTeamChange(event.target.value)}
          className="h-9 max-w-[12rem] rounded-lg border border-input bg-card px-2 text-xs font-medium shadow-sm disabled:opacity-60"
        >
          <option value="">Entrena: sin asignar</option>
          {clubTeams.map((team) => (
            <option key={team.id} value={team.id}>
              Entrena: {team.short_name || team.name}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
