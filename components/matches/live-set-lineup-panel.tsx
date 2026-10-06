"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LineupPicker } from "@/components/matches/lineup-picker";
import { Button } from "@/components/ui/button";
import { setLiveSetLineup } from "@/lib/actions/matches";
import type { MatchLineupEntry, Player } from "@/lib/types";

export function LiveSetLineupPanel({
  matchId,
  setNumber,
  teamId,
  teamName,
  players,
  lineup,
  fresh = false,
  onDone,
  onSkip,
}: {
  matchId: string;
  setNumber: number;
  teamId: string;
  teamName: string;
  players: Player[];
  lineup: MatchLineupEntry[];
  fresh?: boolean;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await setLiveSetLineup(matchId, formData);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Titulares del set ${setNumber} guardados`);
    onDone();
  }

  return (
    <form action={onSubmit} className="space-y-4 rounded-3xl border bg-card p-4 shadow-card">
      <div>
        <p className="text-sm font-semibold">Titulares del set {setNumber}</p>
        <p className="text-xs text-muted-foreground">
          {fresh
            ? `El campo está vacío. Coloca otra vez a las 6 y a las líberos de ${teamName}. `
            : `Elige las 6 de pista y las líberos de ${teamName}. `}
          La rotación es la zona de la colocadora: en el saque, el 1 (R1); recibiendo, el 2 (R2).
        </p>
      </div>
      <input type="hidden" name="setNumber" value={setNumber} />
      {fresh ? <input type="hidden" name="clearSubstitutions" value="1" /> : null}
      <LineupPicker
        key={`${teamId}-${setNumber}-${fresh ? "fresh" : "edit"}`}
        teamId={teamId}
        teamName={teamName}
        players={players}
        lineup={lineup}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onSkip} disabled={pending}>
          {fresh ? "Dejar las mismas" : "Ahora no"}
        </Button>
        <Button type="submit" variant="accent" className="flex-1" disabled={pending}>
          {pending ? "Guardando..." : "Guardar titulares"}
        </Button>
      </div>
    </form>
  );
}
