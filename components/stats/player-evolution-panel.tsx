"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { EVOLUTION_METRICS, PlayerEvolutionChart } from "@/components/stats/charts";
import { ChipRow, PhaseFilterBar } from "@/components/stats/phase-filter";
import { ErrorBreakdownSheet } from "@/components/stats/error-breakdown-sheet";
import { AttackServeCards } from "@/components/stats/skill-stats";
import { StatSummary } from "@/components/stats/stat-summary";
import { TeamLogo } from "@/components/teams/team-logo";
import { Card, CardContent } from "@/components/ui/card";
import { matchStatusMeta } from "@/lib/constants";
import { DEFAULT_PHASE_FILTER, filterEventsByPhase, type PhaseFilter } from "@/lib/stat-filters";
import { formatMatchWhen } from "@/lib/federation/schedule";
import {
  buildPlayerMatchSeries,
  formatMatchLabel,
  normalizeSetScores,
  summarizePlayerSeries,
} from "@/lib/stats";
import { errorBreakdownFromEvents } from "@/lib/error-breakdown";
import { cn, unwrapOne } from "@/lib/utils";
import {
  attackStatsFromEvents,
  blockStatsFromEvents,
  defenseStatsFromEvents,
  formatAttackEfficiency,
  receptionStatsFromEvents,
  serveStatsFromEvents,
  type AttackStats,
  type BlockStats,
  type DefenseStats,
  type ReceptionStats,
  type ServeStats,
} from "@/lib/volleyball-stats";
import type { PointType } from "@/lib/types";

export type PlayerStatTeam = {
  name?: string | null;
  short_name?: string | null;
  logo_url?: string | null;
  federation_team_id?: string | null;
};

export type PlayerStatEventMatch = {
  scheduled_at?: string | null;
  status?: string | null;
  notes?: string | null;
  is_federation?: boolean | null;
  home_sets?: number | null;
  away_sets?: number | null;
  set_scores?: unknown;
  home_team_id?: string | null;
  away_team_id?: string | null;
  home_team?: PlayerStatTeam | PlayerStatTeam[] | null;
  away_team?: PlayerStatTeam | PlayerStatTeam[] | null;
};

export type PlayerStatEvent = {
  match_id: string;
  point_type: PointType;
  created_at: string;
  set_number?: number | null;
  serving_team_id?: string | null;
  match?: PlayerStatEventMatch | null;
};

type MatchOption = { id: string; label: string; date: string };

function teamDisplayName(
  team?: { name?: string | null; short_name?: string | null } | null
) {
  return team?.short_name || team?.name || "Rival";
}

function buildMatchOptions(
  events: PlayerStatEvent[],
  teamId?: string | null
): MatchOption[] {
  const byMatch = new Map<string, MatchOption>();

  for (const event of events) {
    if (byMatch.has(event.match_id)) continue;
    const dateIso = event.match?.scheduled_at || event.created_at;
    const dateLabel = formatMatchLabel(dateIso);
    const match = event.match;
    let label = dateLabel;

    if (match && teamId) {
      const isHome = match.home_team_id === teamId;
      const opponent = unwrapOne(isHome ? match.away_team : match.home_team);
      label = `vs ${teamDisplayName(opponent)} · ${dateLabel}`;
    } else if (match?.home_team || match?.away_team) {
      const home = teamDisplayName(unwrapOne(match.home_team));
      const away = teamDisplayName(unwrapOne(match.away_team));
      label = `${home}–${away} · ${dateLabel}`;
    }

    byMatch.set(event.match_id, {
      id: event.match_id,
      label,
      date: dateIso,
    });
  }

  return [...byMatch.values()].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function PlayerEvolutionPanel({
  events,
  teamId,
}: {
  events: PlayerStatEvent[];
  teamId?: string | null;
}) {
  const [filter, setFilter] = useState<PhaseFilter>(DEFAULT_PHASE_FILTER);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("all");
  const [activeKeys, setActiveKeys] = useState<string[]>(["points", "attackEffPct", "errors"]);
  const [errorsOpen, setErrorsOpen] = useState(false);

  const matchOptions = useMemo(
    () => buildMatchOptions(events, teamId),
    [events, teamId]
  );

  const matchChipOptions = useMemo(
    () => [
      { id: "all", label: "Todos los partidos" },
      ...matchOptions.map((item) => ({ id: item.id, label: item.label })),
    ],
    [matchOptions]
  );

  const matchFiltered = useMemo(() => {
    if (selectedMatchId === "all") return events;
    return events.filter((event) => event.match_id === selectedMatchId);
  }, [events, selectedMatchId]);

  const filtered = useMemo(
    () =>
      filterEventsByPhase(
        matchFiltered,
        { sets: "all", possession: filter.possession },
        teamId
      ),
    [matchFiltered, filter.possession, teamId]
  );
  const series = useMemo(() => buildPlayerMatchSeries(filtered), [filtered]);
  const matchCards = useMemo(
    () => buildPlayerMatchCards(filtered, teamId),
    [filtered, teamId]
  );
  const totals = useMemo(() => summarizePlayerSeries(series), [series]);
  const errorBreakdown = useMemo(
    () =>
      errorBreakdownFromEvents(filtered, (matchId) => {
        return matchOptions.find((item) => item.id === matchId)?.label ?? "Partido";
      }),
    [filtered, matchOptions]
  );
  const metrics = EVOLUTION_METRICS.filter((item) => activeKeys.includes(item.key));

  function toggleMetric(key: string) {
    setActiveKeys((current) => {
      if (current.includes(key)) {
        return current.length === 1 ? current : current.filter((item) => item !== key);
      }
      return [...current, key];
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {matchChipOptions.length > 1 ? (
          <ChipRow
            options={matchChipOptions}
            value={selectedMatchId}
            onChange={setSelectedMatchId}
          />
        ) : null}
        <PhaseFilterBar
          value={filter}
          onChange={setFilter}
          showPossession={Boolean(teamId)}
          showSets={false}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {EVOLUTION_METRICS.map((metric) => {
          const active = activeKeys.includes(metric.key);
          return (
            <button
              key={metric.key}
              type="button"
              onClick={() => toggleMetric(metric.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                active ? "text-white" : "bg-secondary text-muted-foreground"
              )}
              style={active ? { backgroundColor: metric.color } : undefined}
            >
              {metric.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <PlayerEvolutionChart data={series} metrics={metrics} />
        </CardContent>
      </Card>

      <StatSummary
        items={[
          {
            label: "Acciones totales",
            value: filtered.length,
            accent: true,
          },
          { label: "Puntos", value: totals.points },
          {
            label: "Puntos de ataque",
            value: attackStatsFromEvents(filtered).kills,
          },
          {
            label: "Puntos de bloqueo",
            value: filtered.filter(
              (event) => event.point_type === "block" || event.point_type === "blockout"
            ).length,
          },
          {
            label: "Puntos de saque",
            value: serveStatsFromEvents(filtered).aces,
          },
          {
            label: "Errores",
            value: totals.errors,
            onClick: totals.errors > 0 ? () => setErrorsOpen(true) : undefined,
          },
          {
            label: "Eff. ataque",
            value: formatAttackEfficiency(attackStatsFromEvents(filtered).efficiency),
          },
        ]}
      />

      <ErrorBreakdownSheet
        open={errorsOpen}
        onOpenChange={setErrorsOpen}
        rows={errorBreakdown}
        total={totals.errors}
      />

      <AttackServeCards
        attack={attackStatsFromEvents(filtered)}
        serve={serveStatsFromEvents(filtered)}
        block={blockStatsFromEvents(filtered)}
        reception={receptionStatsFromEvents(filtered)}
        defense={defenseStatsFromEvents(filtered)}
      />

      <section>
        <h3 className="mb-3 text-base font-semibold">Partido a partido</h3>
        {matchCards.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay acciones con este filtro.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {matchCards.map((card) => (
              <PlayerMatchCard key={card.matchId} card={card} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const SKILL_TONE = {
  ataque: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-100",
  saque: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-100",
  bloqueo: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-100",
  recepcion: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-100",
  defensa: "bg-slate-200 text-slate-800 dark:bg-slate-500/25 dark:text-slate-100",
} as const;

const SCORE_TONE = {
  win: "bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-50",
  loss: "bg-rose-600 text-white dark:bg-rose-500/20 dark:text-rose-50",
  live: "bg-orange-500 text-white dark:bg-orange-500/20 dark:text-orange-50",
  neutral: "bg-primary text-primary-foreground",
} as const;

const GOOD = "text-emerald-700 dark:text-emerald-300";
const MID = "text-amber-700 dark:text-amber-200";
const POOR = "text-stone-600 dark:text-stone-300";
const BAD = "text-rose-700 dark:text-rose-300";

const PLAYER_POINT_TYPES = new Set<PointType>(["attack", "block", "blockout", "ace", "other"]);

type ResultTone = keyof typeof SCORE_TONE;

type SideTeam = {
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  federationTeamId: string | null;
};

type PlayerMatchCardModel = {
  matchId: string;
  date: string;
  when: string;
  venue: string | null;
  opponent: SideTeam | null;
  title: string;
  versus: boolean;
  ourSets: number | null;
  theirSets: number | null;
  setLines: string[];
  resultLabel: string;
  resultTone: ResultTone;
  points: number;
  otherErrors: number;
  attack: AttackStats;
  serve: ServeStats;
  block: BlockStats;
  reception: ReceptionStats;
  defense: DefenseStats;
};

function sideTeam(team: PlayerStatTeam | null, fallback: string): SideTeam {
  return {
    name: team?.name || team?.short_name || fallback,
    shortName: team?.short_name ?? null,
    logoUrl: team?.logo_url ?? null,
    federationTeamId: team?.federation_team_id ?? null,
  };
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function matchResult(
  status: string | null | undefined,
  knownSide: boolean,
  ourSets: number | null,
  theirSets: number | null
): { label: string; tone: ResultTone } {
  if (status === "live") return { label: "En vivo", tone: "live" };
  if (status === "cancelled") return { label: "Cancelado", tone: "neutral" };
  if (status === "finished" && knownSide && ourSets != null && theirSets != null) {
    if (ourSets > theirSets) return { label: "Victoria", tone: "win" };
    if (ourSets < theirSets) return { label: "Derrota", tone: "loss" };
    return { label: "Empate", tone: "neutral" };
  }
  if (status === "finished") return { label: "Finalizado", tone: "neutral" };
  return { label: matchStatusMeta(status).label, tone: "neutral" };
}

function buildPlayerMatchCards(events: PlayerStatEvent[], teamId?: string | null) {
  const groups = new Map<string, PlayerStatEvent[]>();
  for (const event of events) {
    const list = groups.get(event.match_id);
    if (list) list.push(event);
    else groups.set(event.match_id, [event]);
  }

  const cards: PlayerMatchCardModel[] = [];
  for (const [matchId, list] of groups) {
    const match = unwrapOne(list.find((event) => event.match)?.match);
    const home = unwrapOne(match?.home_team);
    const away = unwrapOne(match?.away_team);
    const date =
      match?.scheduled_at ||
      list.reduce(
        (min, event) => (event.created_at < min ? event.created_at : min),
        list[0].created_at
      );
    const isHome = Boolean(teamId && match?.home_team_id === teamId);
    const isAway = Boolean(teamId && match?.away_team_id === teamId);
    const knownSide = isHome || isAway;
    const homeSets = typeof match?.home_sets === "number" ? match.home_sets : null;
    const awaySets = typeof match?.away_sets === "number" ? match.away_sets : null;
    const ourSets = knownSide ? (isHome ? homeSets : awaySets) : homeSets;
    const theirSets = knownSide ? (isHome ? awaySets : homeSets) : awaySets;
    const flip = knownSide && isAway;
    const setLines = normalizeSetScores(match?.set_scores).map((set) => {
      const left = flip ? set.away : set.home;
      const right = flip ? set.home : set.away;
      return `${left}–${right}`;
    });
    const result = matchResult(match?.status, knownSide, ourSets, theirSets);
    const opponent = knownSide ? sideTeam(isHome ? away : home, "Rival") : null;

    cards.push({
      matchId,
      date,
      when: formatMatchWhen({
        scheduledAt: date,
        notes: match?.notes,
        isFederation: match?.is_federation,
      }),
      venue: isHome ? "Local" : isAway ? "Visitante" : null,
      opponent,
      title: opponent ? opponent.name : `${sideTeam(home, "Local").name} – ${sideTeam(away, "Visitante").name}`,
      versus: Boolean(opponent),
      ourSets,
      theirSets,
      setLines,
      resultLabel: result.label,
      resultTone: result.tone,
      points: list.filter((event) => PLAYER_POINT_TYPES.has(event.point_type)).length,
      otherErrors: list.filter((event) => event.point_type === "error").length,
      attack: attackStatsFromEvents(list),
      serve: serveStatsFromEvents(list),
      block: blockStatsFromEvents(list),
      reception: receptionStatsFromEvents(list),
      defense: defenseStatsFromEvents(list),
    });
  }

  return cards.sort((a, b) => {
    const at = new Date(a.date).getTime();
    const bt = new Date(b.date).getTime();
    if (Number.isNaN(at) || Number.isNaN(bt)) return 0;
    return bt - at;
  });
}

function PlayerMatchCard({ card }: { card: PlayerMatchCardModel }) {
  const score =
    card.ourSets != null && card.theirSets != null ? `${card.ourSets}–${card.theirSets}` : "–";
  const hasSkills =
    card.attack.attempts > 0 ||
    card.serve.attempts > 0 ||
    card.block.attempts > 0 ||
    card.reception.total > 0 ||
    card.defense.total > 0 ||
    card.otherErrors > 0;

  return (
    <Link
      href={`/partidos/${card.matchId}`}
      className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-card transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex items-center gap-3 p-3">
        {card.opponent ? (
          <TeamLogo
            name={card.opponent.name}
            shortName={card.opponent.shortName}
            logoUrl={card.opponent.logoUrl}
            federationTeamId={card.opponent.federationTeamId}
            size="md"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight [overflow-wrap:anywhere]">
            {card.versus ? <span className="font-medium text-muted-foreground">vs </span> : null}
            {card.title}
          </p>
          <p className="mt-0.5 text-[11px] font-medium capitalize text-muted-foreground">
            {card.when}
            {card.venue ? ` · ${card.venue}` : ""}
          </p>
          <p className="mt-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {card.points} {card.points === 1 ? "pt" : "pts"} del jugador
          </p>
        </div>
        <div
          className={cn(
            "shrink-0 rounded-xl px-2.5 py-2 text-center",
            SCORE_TONE[card.resultTone]
          )}
        >
          <p className="text-xl font-black tabular-nums leading-none">{score}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-90">
            {card.resultLabel}
          </p>
        </div>
      </div>
      {card.setLines.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 px-3 pb-3">
          <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Parciales
          </span>
          {card.setLines.map((line, index) => (
            <span
              key={`${card.matchId}-set-${index}`}
              className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-secondary-foreground"
            >
              {line}
            </span>
          ))}
        </div>
      ) : null}
      {hasSkills ? (
        <div className="mt-auto divide-y divide-border border-t border-border">
          {card.attack.attempts > 0 ? (
            <SkillRow label="Ataque" tone={SKILL_TONE.ataque}>
              <AttackLine stats={card.attack} />
            </SkillRow>
          ) : null}
          {card.serve.attempts > 0 ? (
            <SkillRow label="Saque" tone={SKILL_TONE.saque}>
              <ServeLine stats={card.serve} />
            </SkillRow>
          ) : null}
          {card.block.attempts > 0 ? (
            <SkillRow label="Bloqueo" tone={SKILL_TONE.bloqueo}>
              <BlockLine stats={card.block} />
            </SkillRow>
          ) : null}
          {card.reception.total > 0 ? (
            <SkillRow label="Recepción" tone={SKILL_TONE.recepcion}>
              <GradeLine noun={["recepción", "recepciones"]} stats={card.reception} />
            </SkillRow>
          ) : null}
          {card.defense.total > 0 ? (
            <SkillRow label="Defensa" tone={SKILL_TONE.defensa}>
              <GradeLine noun={["defensa", "defensas"]} stats={card.defense} />
            </SkillRow>
          ) : null}
          {card.otherErrors > 0 ? (
            <p className="px-3 py-2 text-[11px] font-medium text-rose-700 dark:text-rose-300">
              {countLabel(card.otherErrors, "error propio", "errores propios")}
            </p>
          ) : null}
        </div>
      ) : card.points === 0 ? (
        <p className="mt-auto border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Sin acciones
        </p>
      ) : null}
    </Link>
  );
}

function SkillRow({
  label,
  tone,
  children,
}: {
  label: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 px-3 py-2">
      <span
        className={cn(
          "mt-0.5 inline-flex w-[5.75rem] shrink-0 justify-center rounded-md px-1.5 py-1 text-center text-[10px] font-bold uppercase leading-tight tracking-wide",
          tone
        )}
      >
        {label}
      </span>
      <div className="min-w-0 flex-1 pt-0.5 text-xs leading-snug">{children}</div>
    </div>
  );
}

type Bit = { text: string; className?: string };

function Bits({ parts }: { parts: Bit[] }) {
  return parts.map((part, index) => (
    <span key={`${part.text}-${index}`}>
      {index > 0 ? <span className="text-muted-foreground"> · </span> : null}
      <span className={part.className}>{part.text}</span>
    </span>
  ));
}

function SkillBits({ summary, detail }: { summary: Bit[]; detail: Bit[] }) {
  return (
    <>
      <span className="block">
        <Bits parts={summary} />
      </span>
      {detail.length > 0 ? (
        <span className="mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0.5">
          {detail.map((part, index) => (
            <span key={`${part.text}-${index}`} className={part.className}>
              {part.text}
            </span>
          ))}
        </span>
      ) : null}
    </>
  );
}

function AttackLine({ stats }: { stats: AttackStats }) {
  const detail: Bit[] = [];
  if (stats.continuations > 0) {
    detail.push({ text: `${stats.continuations} cont.`, className: GOOD });
  }
  if (stats.errors > 0) detail.push({ text: `${stats.errors} err.`, className: BAD });
  return (
    <SkillBits
      summary={[
        {
          text: `${stats.kills} ${stats.kills === 1 ? "pt" : "pts"}`,
          className: "font-semibold tabular-nums",
        },
        {
          text: countLabel(stats.attempts, "ataque", "ataques"),
          className: "text-muted-foreground",
        },
      ]}
      detail={detail}
    />
  );
}

function ServeLine({ stats }: { stats: ServeStats }) {
  const detail: Bit[] = [];
  if (stats.inPlay > 0) detail.push({ text: `${stats.inPlay} dentro`, className: GOOD });
  if (stats.errors > 0) detail.push({ text: `${stats.errors} err.`, className: BAD });
  return (
    <SkillBits
      summary={[
        {
          text: countLabel(stats.aces, "ace", "aces"),
          className: "font-semibold tabular-nums",
        },
        {
          text: countLabel(stats.attempts, "saque", "saques"),
          className: "text-muted-foreground",
        },
      ]}
      detail={detail}
    />
  );
}

function BlockLine({ stats }: { stats: BlockStats }) {
  const detail: Bit[] = [];
  if (stats.touches > 0) {
    detail.push({ text: countLabel(stats.touches, "toque", "toques"), className: POOR });
  }
  if (stats.continuations > 0) {
    detail.push({ text: `${stats.continuations} cont.`, className: GOOD });
  }
  if (stats.errors > 0) detail.push({ text: `${stats.errors} err.`, className: BAD });
  return (
    <SkillBits
      summary={[
        {
          text: `${stats.points} ${stats.points === 1 ? "pt" : "pts"}`,
          className: "font-semibold tabular-nums",
        },
        {
          text: countLabel(stats.attempts, "bloqueo", "bloqueos"),
          className: "text-muted-foreground",
        },
      ]}
      detail={detail}
    />
  );
}

function GradeLine({
  noun,
  stats,
}: {
  noun: [string, string];
  stats: ReceptionStats | DefenseStats;
}) {
  const detail: Bit[] = [];
  if (stats.good > 0) {
    detail.push({ text: countLabel(stats.good, "buena", "buenas"), className: GOOD });
  }
  if (stats.medium > 0) {
    detail.push({ text: countLabel(stats.medium, "media", "medias"), className: MID });
  }
  if (stats.bad > 0) {
    detail.push({ text: countLabel(stats.bad, "mala", "malas"), className: POOR });
  }
  if (stats.errors > 0) detail.push({ text: `${stats.errors} err.`, className: BAD });
  return (
    <SkillBits
      summary={[
        {
          text: countLabel(stats.total, noun[0], noun[1]),
          className: "font-semibold tabular-nums",
        },
      ]}
      detail={detail}
    />
  );
}
