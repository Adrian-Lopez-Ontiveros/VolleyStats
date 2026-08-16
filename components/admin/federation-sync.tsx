"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  syncFederationLeagues,
  type FederationSyncReport,
} from "@/lib/actions/federation";

export function FederationSync() {
  const [pending, setPending] = useState(false);
  const [report, setReport] = useState<FederationSyncReport | null>(null);

  async function onSync() {
    setPending(true);
    const result = await syncFederationLeagues();
    setPending(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setReport(result);
    toast.success("Sincronización de federación terminada");
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold">Federación de Madrid</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Importa calendario y resultados oficiales de las ligas de CV Fuenlabrada.
            No pisa partidos con seguimiento en vivo.
          </p>
        </div>
        <Button type="button" variant="accent" disabled={pending} onClick={() => void onSync()}>
          {pending ? "Sincronizando..." : "Sincronizar federación"}
        </Button>
        {report ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>Grupos leídos: {report.groups}</li>
            <li>Equipos nuevos: {report.teamsCreated}</li>
            <li>Equipos vinculados: {report.teamsLinked}</li>
            <li>Partidos nuevos: {report.matchesCreated}</li>
            <li>Partidos actualizados: {report.matchesUpdated}</li>
            <li>Omitidos: {report.matchesSkipped}</li>
            {report.errors.map((error) => (
              <li key={error} className="text-rose-700">
                {error}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
