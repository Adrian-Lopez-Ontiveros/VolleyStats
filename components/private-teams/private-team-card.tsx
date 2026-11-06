import Link from "next/link";
import { ArrowRight, CalendarDays, LockKeyhole, UsersRound, Volleyball } from "lucide-react";
import { TeamLogo } from "@/components/teams/team-logo";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Team } from "@/lib/types";

export type PrivateTeamCardInfo = {
  playerCount: number;
  summary: string;
  matchLabel: "Próximo partido" | "Último partido" | "En juego" | null;
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function matchSummary(
  matches: {
    status: string;
    scheduled_at: string;
    home_team_id: string;
    away_team_id: string;
  }[],
  teamId: string,
  names: { id: string; name: string }[],
  now = new Date(),
): { summary: string; matchLabel: PrivateTeamCardInfo["matchLabel"] } {
  const teamMatches = matches.filter(
    (match) => match.home_team_id === teamId || match.away_team_id === teamId,
  );
  const live = teamMatches.find((match) => match.status === "live");
  const upcoming = teamMatches
    .filter((match) => match.status === "scheduled" && new Date(match.scheduled_at) >= now)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
  const selected = live ?? upcoming ?? teamMatches
    .filter((match) => match.status !== "cancelled")
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))[0];

  if (!selected) return { summary: "Tu cuenta de voleibol, a tu manera.", matchLabel: null };
  const opponentId = selected.home_team_id === teamId ? selected.away_team_id : selected.home_team_id;
  const opponent = names.find((team) => team.id === opponentId)?.name ?? "Rival";
  return {
    summary: `${opponent} · ${dateFormatter.format(new Date(selected.scheduled_at))}`,
    matchLabel: live ? "En juego" : upcoming ? "Próximo partido" : "Último partido",
  };
}

export function PrivateTeamCard({ team, info }: { team: Team; info: PrivateTeamCardInfo }) {
  return (
    <Link
      href={`/mis-equipos/${team.id}`}
      aria-label={`Abrir ${team.name}: plantilla y partidos privados`}
      className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="relative flex h-full flex-col overflow-hidden transition duration-200 group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-lg group-focus-visible:border-accent/40 group-active:scale-[0.99]">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,hsl(var(--accent)/0.10),transparent)]" />
        <div className="relative flex flex-1 flex-col items-center px-5 pb-5 pt-6 text-center">
          <div className="relative">
            <TeamLogo
              name={team.name}
              shortName={team.short_name}
              logoUrl={team.logo_url}
              size="xl"
              className="rounded-full border-accent/25 bg-secondary text-lg shadow-sm ring-4 ring-accent/5"
            />
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground">
              <Volleyball className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
          <h3 className="mt-4 break-words text-lg font-bold leading-tight">{team.name}</h3>
          <Badge variant="secondary" className="mt-2 bg-accent/10 px-2.5 py-0.5 text-xs text-accent">
            <LockKeyhole className="h-3 w-3" aria-hidden />
            Privado
          </Badge>
          <div className="mt-5 flex w-full items-center justify-center gap-1.5 border-t pt-4 text-sm text-muted-foreground">
            <UsersRound className="h-4 w-4 text-primary dark:text-accent" aria-hidden />
            {info.playerCount} {info.playerCount === 1 ? "jugador" : "jugadores"}
          </div>
          <div className="mt-2 flex min-h-[2.5rem] max-w-full items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="break-words">{info.matchLabel ? `${info.matchLabel}: ` : ""}{info.summary}</span>
          </div>
        </div>
        <div className="flex w-full items-center justify-center gap-2 rounded-b-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors group-hover:bg-accent">
          Ver equipo
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>
      </Card>
    </Link>
  );
}
