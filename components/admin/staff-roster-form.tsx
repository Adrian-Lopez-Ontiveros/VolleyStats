"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addStaffRosterMember, removeStaffRosterMember } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/types";

export type StaffRosterRow = {
  id: string;
  full_name: string;
  email: string | null;
  coached_team_id: string | null;
  user_id: string | null;
};

export function StaffRosterForm({
  clubTeams,
  staff,
}: {
  clubTeams: Pick<Team, "id" | "name" | "short_name">[];
  staff: StaffRosterRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [teamId, setTeamId] = useState(clubTeams[0]?.id ?? "");

  function onAdd() {
    startTransition(async () => {
      const result = await addStaffRosterMember({
        fullName,
        email: email || null,
        coachedTeamId: teamId || null,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Entrenador añadido al staff. Ya puede registrarse.");
        setFullName("");
        setEmail("");
        router.refresh();
      }
    });
  }

  function onRemove(id: string, name: string) {
    if (!confirm(`¿Quitar a ${name} del staff de registro?`)) return;
    startTransition(async () => {
      const result = await removeStaffRosterMember(id);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Quitado del staff");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nombre y apellido"
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (opcional)"
          type="email"
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
        />
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
          aria-label="Equipo que entrenará"
        >
          <option value="">Sin equipo asignado</option>
          {clubTeams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.short_name || team.name}
            </option>
          ))}
        </select>
        <Button type="button" variant="accent" disabled={pending || !fullName.trim()} onClick={onAdd}>
          Añadir al staff
        </Button>
      </div>

      {staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nadie en el staff. Añade entrenadores que no juegan para que puedan registrarse sin ficha de jugador.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border border-border bg-card">
          {staff.map((row) => {
            const team = clubTeams.find((t) => t.id === row.coached_team_id);
            return (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{row.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.email || "Sin email"} · {team?.short_name || team?.name || "Sin equipo"} ·{" "}
                    {row.user_id ? "Cuenta vinculada" : "Pendiente de registro"}
                  </p>
                </div>
                {!row.user_id ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() => onRemove(row.id, row.full_name)}
                  >
                    Quitar
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
