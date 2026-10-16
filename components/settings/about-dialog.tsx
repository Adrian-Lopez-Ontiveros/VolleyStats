"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AboutDialog({
  open,
  onOpenChange,
  version,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border bg-background p-5 shadow-lg">
          <Dialog.Title className="text-lg font-bold">Acerca de FuenlaStats</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Versión {version} · CV Fuenlabrada
          </Dialog.Description>
          <p className="mt-4 text-sm">
            Estadísticas, partidos y liga del CV Fuenlabrada, hechas por y para el club.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Resultados y calendario de la Federación de Voleibol de Madrid (FMV).
          </p>
          <Dialog.Close asChild>
            <Button type="button" variant="outline" className="mt-5 w-full">
              Cerrar
            </Button>
          </Dialog.Close>
          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
