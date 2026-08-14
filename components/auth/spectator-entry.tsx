"use client";

import { Eye } from "lucide-react";
import { enterAsSpectator } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function SpectatorEntry() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        o
        <span className="h-px flex-1 bg-border" />
      </div>
      <form action={enterAsSpectator}>
        <Button type="submit" variant="outline" className="w-full">
          <Eye className="h-4 w-4" />
          Entrar como espectador
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        Puedes ver partidos, clasificación, equipos y estadísticas. No hace falta cuenta ni
        estar en la plantilla.
      </p>
    </div>
  );
}
