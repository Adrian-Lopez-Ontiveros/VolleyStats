import { format } from "date-fns";
import { es } from "date-fns/locale";
import { APP_NAME } from "@/lib/constants";
import { formatJersey } from "@/lib/utils";
import {
  formatAttackEfficiency,
  formatSkillRate,
} from "@/lib/volleyball-stats";
import type { BoxScoreModel } from "@/lib/box-score";
import { TeamLogo } from "@/components/teams/team-logo";

export function BoxScoreCard({
  data,
  captureId = "box-score-card",
}: {
  data: BoxScoreModel;
  captureId?: string;
}) {
  const { match } = data;
  const dateLabel = format(new Date(match.scheduled_at), "d MMM yyyy · HH:mm", {
    locale: es,
  });

  return (
    <article
      id={captureId}
      className="overflow-hidden rounded-3xl bg-[#0B1F3A] text-white shadow-card"
    >
      <header className="px-4 pb-3 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300">
          {APP_NAME} · Box score
        </p>
        <p className="mt-1 text-xs text-white/70">{dateLabel}</p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <TeamSide
            name={match.home_team.name}
            shortName={match.home_team.short_name}
            logoUrl={match.home_team.logo_url}
            federationTeamId={match.home_team.federation_team_id}
            align="right"
          />
          <div className="text-center">
            <p className="text-3xl font-black tabular-nums leading-none">
              {match.home_sets}
              <span className="mx-1 text-orange-300">–</span>
              {match.away_sets}
            </p>
            {match.set_scores.length > 0 ? (
              <p className="mt-1 text-[10px] tabular-nums text-white/70">
                {match.set_scores.map((set) => `${set.home}-${set.away}`).join("  ")}
              </p>
            ) : null}
          </div>
          <TeamSide
            name={match.away_team.name}
            shortName={match.away_team.short_name}
            logoUrl={match.away_team.logo_url}
            federationTeamId={match.away_team.federation_team_id}
            align="left"
          />
        </div>
      </header>

      <div className="space-y-4 rounded-t-3xl bg-[#F8FAFC] px-3 py-4 text-slate-900">
        <section>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Destacados
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {data.highlights.map((item) => (
              <div key={item.label} className="rounded-2xl border bg-white px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {item.label}
                </p>
                <p className="text-lg font-black tabular-nums text-[#0B1F3A]">{item.value}</p>
                <p className="truncate text-[11px] text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {data.players.length > 0 ? (
          <section>
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Puntos por jugador
            </h3>
            <div className="overflow-hidden rounded-2xl border bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2 text-left">Jugador</th>
                    <th className="px-1 py-2 text-center">Pts</th>
                    <th className="px-1 py-2 text-center">ATK</th>
                    <th className="px-1 py-2 text-center">ACE</th>
                    <th className="px-1 py-2 text-center">Err</th>
                  </tr>
                </thead>
                <tbody>
                  {data.players.map((player) => (
                    <tr key={player.playerId} className="border-t border-slate-100">
                      <td className="max-w-[9rem] truncate px-2 py-1.5 font-medium">
                        {formatJersey(player.jersey)} {player.name}
                      </td>
                      <td className="px-1 py-1.5 text-center font-bold tabular-nums">
                        {player.points}
                      </td>
                      <td className="px-1 py-1.5 text-center tabular-nums">
                        {player.kills}
                        {player.attackAttempts
                          ? ` · ${formatAttackEfficiency(player.attackEfficiency)}`
                          : ""}
                      </td>
                      <td className="px-1 py-1.5 text-center tabular-nums">{player.aces}</td>
                      <td className="px-1 py-1.5 text-center tabular-nums">{player.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {data.costlyErrors.length > 0 ? (
          <section>
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Errores más costosos
            </h3>
            <ul className="space-y-1">
              {data.costlyErrors.map((player) => (
                <li
                  key={player.playerId}
                  className="flex items-center justify-between rounded-xl border bg-white px-3 py-1.5 text-xs"
                >
                  <span className="truncate font-medium">
                    {formatJersey(player.jersey)} {player.name}
                  </span>
                  <span className="tabular-nums text-rose-700">{player.errors} err</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Rotaciones {data.clubLabel}
          </h3>
          <div className="overflow-hidden rounded-2xl border bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2 text-left">R</th>
                  <th className="px-1 py-2 text-center">PF-PC</th>
                  <th className="px-1 py-2 text-center">Recibiendo</th>
                  <th className="px-1 py-2 text-center">Con saque</th>
                  <th className="px-1 py-2 text-center">ATK%</th>
                </tr>
              </thead>
              <tbody>
                {data.clubRotations.map((row) => (
                  <tr key={row.rotation} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-semibold">R{row.rotation}</td>
                    <td className="px-1 py-1.5 text-center tabular-nums">
                      {row.pointsFor}-{row.pointsAgainst}
                    </td>
                    <td className="px-1 py-1.5 text-center tabular-nums">
                      {formatSkillRate(row.sideOut.rate)}
                    </td>
                    <td className="px-1 py-1.5 text-center tabular-nums">
                      {formatSkillRate(row.breakPoint.rate)}
                    </td>
                    <td className="px-1 py-1.5 text-center tabular-nums">
                      {formatAttackEfficiency(row.attack.efficiency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </article>
  );
}

function TeamSide({
  name,
  shortName,
  logoUrl,
  federationTeamId,
  align,
}: {
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  federationTeamId?: string | null;
  align: "left" | "right";
}) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "justify-end" : "justify-start"}`}>
      {align === "left" ? (
        <TeamLogo
          name={name}
          shortName={shortName}
          logoUrl={logoUrl}
          federationTeamId={federationTeamId}
          size="sm"
          inverted
        />
      ) : null}
      <p className={`min-w-0 text-sm font-bold leading-tight [overflow-wrap:anywhere] ${align === "right" ? "text-right" : "text-left"}`}>
        {name}
      </p>
      {align === "right" ? (
        <TeamLogo
          name={name}
          shortName={shortName}
          logoUrl={logoUrl}
          federationTeamId={federationTeamId}
          size="sm"
          inverted
        />
      ) : null}
    </div>
  );
}
