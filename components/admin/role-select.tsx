"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setUserCoachedTeams, setUserRole } from "@/lib/actions/admin";
import { ROLE_LABELS } from "@/lib/constants";
import type { Team, UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["player", "coach", "admin"];

export function RoleSelect({
  userId,
  role,
  coachedTeamId = null,
  coachedTeamIds = [],
  playingTeamName = null,
  clubTeams = [],
  disabled,
}: {
  userId: string;
  role: UserRole;
  coachedTeamId?: string | null;
  /** Equipos que entrena (team_coaches). Si vacío, se usa coachedTeamId. */
  coachedTeamIds?: string[];
  playingTeamName?: string | null;
  clubTeams?: Pick<Team, "id" | "name" | "short_name">[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const showCoachTeam = role === "coach" || role === "admin";
  const selected = new Set(
    coachedTeamIds.length > 0
      ? coachedTeamIds
      : coachedTeamId
        ? [coachedTeamId]
        : []
  );

  function onRoleChange(next: UserRole) {
    if (next === role) return;
    startTransition(async () => {
      const primary = [...selected][0] ?? coachedTeamId;
      const result = await setUserRole(
        userId,
        next,
        next === "player" ? null : primary
      );
      if (result.error) toast.error(result.error);
      else {
        toast.success(`Rol actualizado a ${ROLE_LABELS[next].toLowerCase()}`);
        router.refresh();
      }
    });
  }

  function onToggleTeam(teamId: string, checked: boolean) {
    startTransition(async () => {
      const next = new Set(selected);
      if (checked) next.add(teamId);
      else next.delete(teamId);
      const result = await setUserCoachedTeams(userId, [...next]);
      if (result.error) toast.error(result.error);
      else {
        toast.success(
          next.size
            ? `Entrena ${next.size} equipo${next.size === 1 ? "" : "s"}`
            : "Sin equipo de entrenador"
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-col items-stretch gap-2 sm:items-end">
      {playingTeamName ? (
        <p className="text-[11px] text-muted-foreground">Juega en {playingTeamName}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">Sin ficha de jugador</p>
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
        <div className="max-w-[14rem] space-y-1 rounded-lg border border-input bg-card p-2 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Equipos que entrena
          </p>
          {clubTeams.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No hay equipos del club</p>
          ) : (
            clubTeams.map((team) => (
              <label
                key={team.id}
                className="flex cursor-pointer items-center gap-2 text-xs font-medium"
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-orange-500"
                  checked={selected.has(team.id)}
                  disabled={disabled || pending}
                  onChange={(event) => onToggleTeam(team.id, event.target.checked)}
                />
                <span className="truncate">{team.short_name || team.name}</span>
              </label>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
