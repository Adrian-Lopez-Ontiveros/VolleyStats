"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteTraining } from "@/lib/actions/trainings";
import { Button } from "@/components/ui/button";

export function DeleteTrainingButton({ trainingId }: { trainingId: string }) {
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!confirm("¿Eliminar este entrenamiento y sus archivos?")) return;
    setPending(true);
    const result = await deleteTraining(trainingId);
    setPending(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <Button variant="destructive" onClick={onDelete} disabled={pending} className="w-full">
      {pending ? "Eliminando..." : "Eliminar entrenamiento"}
    </Button>
  );
}
