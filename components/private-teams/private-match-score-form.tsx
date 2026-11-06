"use client";
import { useActionState } from "react";
import { Save } from "lucide-react";
import { updatePrivateMatchResult } from "@/lib/actions/private-teams";
import { AjudgeAlert } from "@/components/private-teams/form-alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Match } from "@/lib/types";
export function PrivateMatchResultEditor({ match }: { match: Match }) {
  // Server-authorizes membership; a viewer only receives this read-only result.
  return <div className="space-y-2"><p className="text-sm text-muted-foreground">Consulta de resultado. Solo el propietario o un editor de un equipo participante puede modificarlo.</p>{match.set_scores.length > 0 ? match.set_scores.map((set, index) => <p key={index} className="flex justify-between border-b py-2 text-sm"><span>Set {index + 1}</span><strong>{set.home}–{set.away}</strong></p>) : <p className="text-sm">Todavía no se ha introducido el resultado.</p>}</div>;
}

export function PrivateMatchScoreForm({ match }: { match: Match }) {
  const [state, action, pending] = useActionState(updatePrivateMatchResult, {});
  return <form action={action} className="space-y-4">
    <input type="hidden" name="matchId" value={match.id} /><AjudgeAlert state={state} />
    <div className="grid grid-cols-3 gap-3 text-center text-xs font-semibold uppercase text-muted-foreground"><span>Set</span><span>Local</span><span>Visitante</span></div>
    {[0,1,2,3,4].map((index) => <div key={index} className="grid grid-cols-3 items-center gap-3"><Label htmlFor={`set-${index}`}>Set {index + 1}</Label><Input id={`set-${index}`} name={`set${index + 1}Home`} type="number" min={0} max={99} defaultValue={match.set_scores[index]?.home ?? ""} aria-label={`Puntos locales, set ${index + 1}`} /><Input name={`set${index + 1}Away`} type="number" min={0} max={99} defaultValue={match.set_scores[index]?.away ?? ""} aria-label={`Puntos visitantes, set ${index + 1}`} /></div>)}
    <p className="text-xs text-muted-foreground">Rellena solo los sets jugados, sin dejar huecos. Gana el primero que consigue 3 sets.</p>
    <Button type="submit" variant="accent" disabled={pending}><Save className="h-4 w-4" />{pending ? "Guardando…" : "Guardar resultado"}</Button>
  </form>;
}
