"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { TEAM_CATEGORIES, type TeamCategory } from "@/lib/categories";
import {
  getFmvTestLeague,
  listFmvCompetitionTypes,
  listFmvCompetitions,
  listFmvDivisions,
  listFmvGroups,
  listFmvPhases,
  syncFederationGroup,
  type FederationSyncReport,
} from "@/lib/actions/federation";
import type { FmvOption } from "@/lib/federation/client";

const SELECT_CLASS =
  "flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50";

function unwrapOptions(result: FmvOption[] | { error: string }): FmvOption[] {
  if (Array.isArray(result)) return result;
  toast.error(result.error);
  return [];
}

export function FederationSync() {
  const [pending, setPending] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [report, setReport] = useState<FederationSyncReport | null>(null);

  const [types, setTypes] = useState<FmvOption[]>([]);
  const [competitions, setCompetitions] = useState<FmvOption[]>([]);
  const [divisions, setDivisions] = useState<FmvOption[]>([]);
  const [phases, setPhases] = useState<FmvOption[]>([]);
  const [groups, setGroups] = useState<FmvOption[]>([]);

  const [typeId, setTypeId] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [category, setCategory] = useState<TeamCategory>("cadete_femenino");

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    setLoadingCatalog(true);
    try {
      const [typeResult, test] = await Promise.all([
        listFmvCompetitionTypes(),
        getFmvTestLeague(),
      ]);
      const nextTypes = unwrapOptions(typeResult);
      setTypes(nextTypes);

      if ("error" in test) {
        toast.error(test.error);
        if (nextTypes[0]) await applyType(nextTypes[0].id);
        return;
      }

      setCategory(test.category);
      await applyPath({
        typeId: test.typeId,
        competitionId: test.competitionId,
        divisionId: test.divisionId,
        phaseId: test.phaseId,
        groupId: test.groupId,
      });
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function applyPath(path: {
    typeId: string;
    competitionId: string;
    divisionId: string;
    phaseId: string;
    groupId: string;
  }) {
    setTypeId(path.typeId);
    const nextCompetitions = unwrapOptions(await listFmvCompetitions(path.typeId));
    setCompetitions(nextCompetitions);

    setCompetitionId(path.competitionId);
    const nextDivisions = unwrapOptions(await listFmvDivisions(path.competitionId));
    setDivisions(nextDivisions);

    setDivisionId(path.divisionId);
    const nextPhases = unwrapOptions(await listFmvPhases(path.divisionId));
    setPhases(nextPhases);

    setPhaseId(path.phaseId);
    const nextGroups = unwrapOptions(await listFmvGroups(path.phaseId));
    setGroups(nextGroups);
    setGroupId(path.groupId);
  }

  async function applyType(nextTypeId: string) {
    setTypeId(nextTypeId);
    setCompetitionId("");
    setDivisionId("");
    setPhaseId("");
    setGroupId("");
    setDivisions([]);
    setPhases([]);
    setGroups([]);
    const nextCompetitions = unwrapOptions(await listFmvCompetitions(nextTypeId));
    setCompetitions(nextCompetitions);
  }

  async function applyCompetition(nextCompetitionId: string) {
    setCompetitionId(nextCompetitionId);
    setDivisionId("");
    setPhaseId("");
    setGroupId("");
    setPhases([]);
    setGroups([]);
    const nextDivisions = unwrapOptions(await listFmvDivisions(nextCompetitionId));
    setDivisions(nextDivisions);
  }

  async function applyDivision(nextDivisionId: string) {
    setDivisionId(nextDivisionId);
    setPhaseId("");
    setGroupId("");
    setGroups([]);
    const nextPhases = unwrapOptions(await listFmvPhases(nextDivisionId));
    setPhases(nextPhases);
  }

  async function applyPhase(nextPhaseId: string) {
    setPhaseId(nextPhaseId);
    setGroupId("");
    const nextGroups = unwrapOptions(await listFmvGroups(nextPhaseId));
    setGroups(nextGroups);
  }

  async function onUseTestLeague() {
    setPending(true);
    try {
      const test = await getFmvTestLeague();
      if ("error" in test) {
        toast.error(test.error);
        return;
      }
      setCategory(test.category);
      await applyPath(test);
      toast.success("Liga de prueba seleccionada");
    } finally {
      setPending(false);
    }
  }

  async function onSync() {
    if (!groupId) {
      toast.error("Selecciona un grupo para sincronizar.");
      return;
    }
    setPending(true);
    try {
      const result = await syncFederationGroup(groupId, category);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setReport(result);
      toast.success("Sincronización de federación terminada");
    } finally {
      setPending(false);
    }
  }

  const selectedGroup = groups.find((item) => item.id === groupId);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold">Federación de Madrid</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Elige cualquier competición y grupo de fmvoley.com. Importa calendario y
            resultados oficiales. No pisa partidos que ya tengan seguimiento en vivo.
            Si la temporada aún no ha empezado, se importa el calendario y los
            marcadores se actualizarán en la siguiente sincronización.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={pending || loadingCatalog}
          onClick={() => void onUseTestLeague()}
        >
          Usar liga de prueba
        </Button>
        <p className="text-xs text-muted-foreground">
          Cadete Femenino · 1ª División Autonómica Preferente · Grupo Único
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo" htmlFor="fmvType">
            <select
              id="fmvType"
              value={typeId}
              disabled={loadingCatalog || pending}
              onChange={(event) => void applyType(event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                Tipo de competición
              </option>
              {types.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Competición" htmlFor="fmvCompetition">
            <select
              id="fmvCompetition"
              value={competitionId}
              disabled={!typeId || pending}
              onChange={(event) => void applyCompetition(event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                Competición
              </option>
              {competitions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="División" htmlFor="fmvDivision">
            <select
              id="fmvDivision"
              value={divisionId}
              disabled={!competitionId || pending}
              onChange={(event) => void applyDivision(event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                División
              </option>
              {divisions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fase" htmlFor="fmvPhase">
            <select
              id="fmvPhase"
              value={phaseId}
              disabled={!divisionId || pending}
              onChange={(event) => void applyPhase(event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                Fase
              </option>
              {phases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Grupo" htmlFor="fmvGroup">
            <select
              id="fmvGroup"
              value={groupId}
              disabled={!phaseId || pending}
              onChange={(event) => setGroupId(event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                Grupo
              </option>
              {groups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Guardar en" htmlFor="fmvCategory">
            <select
              id="fmvCategory"
              value={category}
              disabled={pending}
              onChange={(event) => setCategory(event.target.value as TeamCategory)}
              className={SELECT_CLASS}
            >
              {TEAM_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Button type="button" variant="accent" disabled={pending || !groupId} onClick={() => void onSync()}>
          {pending
            ? "Sincronizando..."
            : selectedGroup
              ? `Sincronizar ${selectedGroup.name}`
              : "Sincronizar grupo"}
        </Button>

        {report ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {report.groupName ? <li>{report.groupName}</li> : null}
            <li>Grupos leídos: {report.groups}</li>
            <li>Equipos nuevos: {report.teamsCreated}</li>
            <li>Equipos vinculados: {report.teamsLinked}</li>
            <li>Partidos nuevos: {report.matchesCreated}</li>
            <li>Partidos actualizados: {report.matchesUpdated}</li>
            <li>Omitidos (con seguimiento en vivo u otros): {report.matchesSkipped}</li>
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

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
