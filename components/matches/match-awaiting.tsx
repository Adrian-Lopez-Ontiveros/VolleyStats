import { Volleyball } from "lucide-react";
import type { MatchStatus } from "@/lib/types";

const COPY: Record<MatchStatus | "points", { title: string; description: string }> = {
  scheduled: {
    title: "Este partido todavía no tiene datos",
    description:
      "Cuando empiece el seguimiento verás aquí el resumen, el punto a punto y los cambios.",
  },
  live: {
    title: "En vivo, a la espera del primer punto",
    description: "El marcador de arriba se mueve en cuanto se anota el primer tanto.",
  },
  finished: {
    title: "Sin estadísticas apuntadas",
    description:
      "El resultado de arriba es el del partido. El resumen y el historial salen si se hace el seguimiento.",
  },
  cancelled: {
    title: "Partido cancelado",
    description: "No hay estadísticas que mostrar.",
  },
  points: {
    title: "Todavía no hay puntos",
    description: "El relato punto a punto aparecerá aquí con el primer tanto.",
  },
};

export function MatchAwaiting({ status = "scheduled" }: { status?: MatchStatus | "points" }) {
  const copy = COPY[status];

  return (
    <section className="overflow-hidden rounded-3xl border bg-card shadow-card">
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500/15 text-orange-700 dark:bg-orange-500/20 dark:text-orange-100">
          <Volleyball className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold">{copy.title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
      </div>
    </section>
  );
}
