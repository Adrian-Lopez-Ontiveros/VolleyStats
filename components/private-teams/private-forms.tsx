"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Check, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AjudgeAlert } from "@/components/private-teams/form-alert";
import { acceptPrivateInvitations, createPrivateLeague, createPrivateMatch, createPrivateTeam, invitePrivateMember, type PrivateActionState } from "@/lib/actions/private-teams";
import type { PrivateLeague } from "@/lib/types";
import type { PrivateTeam } from "@/lib/private-teams-data";

export function CreateLeagueForm() {
  const [state, action, pending] = useActionState(createPrivateLeague, {});
  return <form action={action} className="space-y-3">
    <AjudgeAlert state={state} />
    <div className="space-y-2"><Label htmlFor="league-name">Nombre de la liga privada</Label><Input id="league-name" name="name" required minLength={2} maxLength={100} placeholder="Liga del Cadete A" /></div>
    <Button type="submit" variant="accent" disabled={pending}><Plus className="h-4 w-4" />{pending ? "Creando…" : "Crear liga"}</Button>
  </form>;
}

export function CreateTeamForm({ league }: { league: PrivateLeague }) {
  const [state, action, pending] = useActionState(createPrivateTeam, {});
  return <form action={action} className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
    <input type="hidden" name="leagueId" value={league.id} />
    <div className="sm:col-span-3"><AjudgeAlert state={state} /></div>
    <div className="space-y-2"><Label htmlFor="team-name">Nombre del equipo o rival</Label><Input id="team-name" name="name" required minLength={2} maxLength={100} placeholder="CV Fuenlabrada Cadete A" /></div>
    <div className="space-y-2"><Label htmlFor="team-short">Nombre corto</Label><Input id="team-short" name="shortName" maxLength={12} placeholder="FUEN-A" /></div>
    <Button type="submit" variant="accent" disabled={pending}><Plus className="h-4 w-4" />{pending ? "Añadiendo…" : "Añadir"}</Button>
  </form>;
}

export function CreateMatchForm({ leagueId, teams }: { leagueId: string; teams: PrivateTeam[] }) {
  const [state, action, pending] = useActionState(createPrivateMatch, {});
  return <form action={action} className="space-y-3">
    <input type="hidden" name="leagueId" value={leagueId} />
    <AjudgeAlert state={state} />
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-2"><Label htmlFor="home-team">Local</Label><select id="home-team" name="homeTeamId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required defaultValue=""><option value="" disabled>Elige local</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="away-team">Visitante</Label><select id="away-team" name="awayTeamId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required defaultValue=""><option value="" disabled>Elige visitante</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="match-date">Fecha y hora</Label><Input id="match-date" name="scheduledAt" type="datetime-local" required /></div>
    </div>
    <Button type="submit" variant="accent" disabled={pending || teams.length < 2}><Plus className="h-4 w-4" />{pending ? "Creando…" : "Crear partido"}</Button>
  </form>;
}

export function InviteForm({ teamId, leagueId }: { teamId: string; leagueId: string }) {
  const [state, action, pending] = useActionState(invitePrivateMember, {});
  return <form action={action} className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
    <input type="hidden" name="teamId" value={teamId} />
    <div className="sm:col-span-3"><AjudgeAlert state={state} /></div>
    <div className="space-y-2"><Label htmlFor={`email-${teamId}`}>Correo de la invitación</Label><Input id={`email-${teamId}`} name="email" type="email" required placeholder="ayudante@club.es" autoComplete="off" /></div>
    <div className="space-y-2"><Label htmlFor={`role-${teamId}`}>Permiso</Label><select id={`role-${teamId}`} name="role" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" defaultValue="viewer"><option value="editor">Editor</option><option value="viewer">Lector</option></select></div>
    <Button type="submit" disabled={pending}><UserPlus className="h-4 w-4" />{pending ? "Guardando…" : "Invitar"}</Button>
    <p className="text-xs text-muted-foreground sm:col-span-3">No se envía email. Si ya tiene cuenta, la persona invitada entra con ese correo y acepta aquí. Si aún no tiene cuenta, debe completar el alta normal de jugador; las invitaciones no sustituyen ese registro: <Link className="font-medium text-accent underline" href={`/mis-equipos?liga=${leagueId}`}>fuenlastats.vercel.app/mis-equipos</Link></p>
  </form>;
}

export function AcceptInvitationsButton() {
  const [state, setState] = useState<PrivateActionState>({});
  const [pending, setPending] = useState(false);
  return <div className="space-y-3">
    <AjudgeAlert state={state} />
    <Button type="button" variant="outline" disabled={pending} onClick={async () => { setPending(true); setState(await acceptPrivateInvitations()); setPending(false); }}><Check className="h-4 w-4" />{pending ? "Comprobando…" : "Buscar y aceptar mis invitaciones"}</Button>
  </div>;
}

export const LeagueInvitations = AcceptInvitationsButton;
