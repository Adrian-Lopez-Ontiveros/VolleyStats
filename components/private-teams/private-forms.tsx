"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AjudgeAlert } from "@/components/private-teams/form-alert";
import { createPrivateMatch, createPrivateTeam, type PrivateActionState } from "@/lib/actions/private-teams";

function ResetAfterSuccess({ state }: { state: PrivateActionState }) {
  return state.success ? <p className="text-xs text-muted-foreground">Ya puedes añadir jugadores a su plantilla.</p> : null;
}

export function CreateTeamForm() {
  const [state, action, pending] = useActionState(createPrivateTeam, {});
  return <form action={action} className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
    <div className="sm:col-span-3"><AjudgeAlert state={state} /></div>
    <div className="space-y-2"><Label htmlFor="team-name">Nombre del equipo</Label><Input id="team-name" name="name" required minLength={2} maxLength={100} placeholder="CV Fuenlabrada Cadete A" /></div>
    <div className="space-y-2"><Label htmlFor="team-short">Nombre corto</Label><Input id="team-short" name="shortName" maxLength={12} placeholder="FUEN-A" /></div>
    <Button type="submit" variant="accent" disabled={pending}><Plus className="h-4 w-4" />{pending ? "Creando…" : "Crear equipo"}</Button>
    <div className="sm:col-span-3"><ResetAfterSuccess state={state} /></div>
  </form>;
}

export function CreateMatchForm({ teamId, leagueId }: { teamId: string; leagueId: string }) {
  const [state, action, pending] = useActionState(createPrivateMatch, {});
  const router = useRouter();
  useEffect(() => { if (state.matchId) router.push(`/mis-equipos/partidos/${state.matchId}`); }, [state.matchId, router]);
  return <form action={action} className="space-y-3">
    <input type="hidden" name="leagueId" value={leagueId} />
    <input type="hidden" name="homeTeamId" value={teamId} />
    <AjudgeAlert state={state} />
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="opponent-name">Nombre del rival</Label><Input id="opponent-name" name="opponentName" required minLength={2} maxLength={100} placeholder="Escribe el nombre del rival" autoComplete="off" /></div>
      <div className="space-y-2"><Label htmlFor="match-date">Fecha y hora</Label><Input id="match-date" name="scheduledAt" type="datetime-local" required /></div>
    </div>
    <p className="text-xs text-muted-foreground">Tu equipo juega de local. Escribe el rival sin necesidad de crear otro equipo. Al crearlo se abre la pantalla del partido.</p>
    <Button type="submit" variant="accent" disabled={pending}><Plus className="h-4 w-4" />{pending ? "Creando…" : "Crear partido privado"}</Button>
  </form>;
}
