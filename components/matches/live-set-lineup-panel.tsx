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
  onDone,
  onSkip,
}: {
  matchId: string;
  setNumber: number;
  teamId: string;
  teamName: string;
  players: Player[];
  lineup: MatchLineupEntry[];
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
          Elige de nuevo las 6 de pista y las líberos de {teamName}. La rotación del set
          empieza en R1.
        </p>
      </div>
      <LineupPicker
        key={`${teamId}-${setNumber}`}
        teamId={teamId}
        teamName={teamName}
        players={players}
        lineup={lineup}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onSkip} disabled={pending}>
          Ahora no
        </Button>
        <Button type="submit" variant="accent" className="flex-1" disabled={pending}>
          {pending ? "Guardando..." : "Guardar titulares"}
        </Button>
      </div>
    </form>
  );
}
