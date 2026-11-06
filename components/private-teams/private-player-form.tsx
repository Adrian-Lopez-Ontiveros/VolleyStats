"use client";
import { useActionState } from "react";
import { Save, UserPlus } from "lucide-react";
import { addPrivatePlayer, updatePrivatePlayer } from "@/lib/actions/private-teams";
import { AjudgeAlert } from "@/components/private-teams/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Player } from "@/lib/types";

export function PrivatePlayerForm({ teamId, player }: { teamId: string; player?: Player }) {
  const [state, action, pending] = useActionState(player ? updatePrivatePlayer : addPrivatePlayer, {});
  return <form action={action} className="grid gap-3 sm:grid-cols-[1fr_110px_160px_auto] sm:items-end">
    <input type="hidden" name="teamId" value={teamId} />{player ? <input type="hidden" name="playerId" value={player.id} /> : null}
    <div className="sm:col-span-4"><AjudgeAlert state={state} /></div>
    <div className="space-y-2"><Label htmlFor={`name-${player?.id ?? teamId}`}>Nombre y apellidos</Label><Input id={`name-${player?.id ?? teamId}`} name="fullName" required minLength={2} maxLength={100} defaultValue={player?.full_name} placeholder="María López" /></div>
    <div className="space-y-2"><Label htmlFor={`jersey-${player?.id ?? teamId}`}>Dorsal</Label><Input id={`jersey-${player?.id ?? teamId}`} name="jerseyNumber" type="number" min={0} max={99} defaultValue={player?.jersey_number ?? ""} /></div>
    <div className="space-y-2"><Label htmlFor={`pos-${player?.id ?? teamId}`}>Posición</Label><select id={`pos-${player?.id ?? teamId}`} name="position" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" defaultValue={player?.position ?? ""}><option value="">Sin indicar</option>{["receptor", "colocador", "central", "opuesto", "libero", "universal"].map((position) => <option key={position} value={position}>{position[0].toUpperCase() + position.slice(1)}</option>)}</select></div>
    <Button type="submit" variant={player ? "outline" : "accent"} disabled={pending}>{player ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}{pending ? "Guardando…" : player ? "Guardar" : "Añadir"}</Button>
  </form>;
}
