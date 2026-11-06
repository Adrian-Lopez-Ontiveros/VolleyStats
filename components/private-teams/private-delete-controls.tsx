"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deletePrivateMatch, deletePrivateTeam, removePrivatePlayer } from "@/lib/actions/private-teams";
import { Button } from "@/components/ui/button";
import { AjudgeAlert } from "@/components/private-teams/form-alert";
import type { PrivateActionState } from "@/lib/actions/private-teams";

type Kind = "team" | "match" | "player";

export function PrivateDeleteButton({ kind, id, teamId, playerName, compact = false }: {
  kind: Kind;
  id: string;
  teamId?: string;
  playerName?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PrivateActionState>({});
  const isTeam = kind === "team";
  const isMatch = kind === "match";

  async function confirm() {
    setPending(true);
    setResult({});
    const response = kind === "team"
      ? await deletePrivateTeam(id)
      : kind === "match"
        ? await deletePrivateMatch(id)
        : await removePrivatePlayer(teamId!, id);
    setPending(false);
    if (response.error) {
      setResult(response);
      return;
    }
    setOpen(false);
    toast.success(isTeam ? "Equipo privado eliminado." : isMatch ? "Partido privado eliminado." : "Jugador retirado; se conserva su historial.");
    if (isTeam) router.push("/mis-equipos");
    else if (isMatch && teamId) router.push(`/mis-equipos/${teamId}`);
    router.refresh();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!pending) { setOpen(next); if (!next) setResult({}); } }}>
      <Dialog.Trigger asChild>
        <Button type="button" variant={compact ? "ghost" : "destructive"} size={compact ? "sm" : "default"}
          className={compact ? "h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}>
          <Trash2 className="h-4 w-4" aria-hidden />
          <span className={compact ? "sr-only sm:not-sr-only" : ""}>
            {isTeam ? "Eliminar equipo" : isMatch ? "Eliminar partido" : "Retirar"}
          </span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background p-5 shadow-xl">
          <Dialog.Title className="text-lg font-bold">
            {isTeam ? "¿Eliminar este equipo privado?" : isMatch ? "¿Eliminar este partido privado?" : `¿Retirar a ${playerName ?? "este jugador"} de la plantilla?`}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {isTeam ? "Se eliminarán también todos sus partidos privados, alineaciones, acciones y estadísticas. Los rivales puntuales que ya no tengan otros partidos desaparecerán. Esta acción no se puede deshacer." : isMatch ? "Se borrarán el partido, sus sets, alineaciones, acciones y estadísticas. El rival puntual se eliminará solo si no participa en otros partidos. Esta acción no se puede deshacer." : "Se quitará de la plantilla y de las convocatorias futuras. Sus partidos y acciones históricas conservarán su nombre; no se borrarán."}
          </Dialog.Description>
          <div className="mt-4"><AjudgeAlert state={result} /></div>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild><Button variant="outline" disabled={pending}>Cancelar</Button></Dialog.Close>
            <Button variant="destructive" disabled={pending} onClick={confirm}>
              <Trash2 className="h-4 w-4" />
              {pending ? "Procesando…" : isTeam ? "Eliminar definitivamente" : isMatch ? "Eliminar partido" : "Retirar jugador"}
            </Button>
          </div>
          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100" disabled={pending}>
            <X className="h-4 w-4" /><span className="sr-only">Cerrar</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
