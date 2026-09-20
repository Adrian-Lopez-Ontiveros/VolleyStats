import { Card, CardContent } from "@/components/ui/card";
import {
  formatAttackEfficiency,
  formatSkillRate,
  type AttackStats,
  type DefenseStats,
  type PossessionStats,
  type ReceptionStats,
  type ServeStats,
} from "@/lib/volleyball-stats";

function StatBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function AttackServeCards({
  attack,
  serve,
  reception,
  defense,
}: {
  attack: AttackStats;
  serve: ServeStats;
  reception?: ReceptionStats;
  defense?: DefenseStats;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatBlock
        label="Eff. ataque"
        value={formatAttackEfficiency(attack.efficiency)}
        hint={
          attack.attempts
            ? `${attack.kills} pts · ${attack.errors} err · ${attack.attempts} int.`
            : "Sin intentos de ataque"
        }
      />
      <StatBlock
        label="Acierto saque"
        value={formatSkillRate(serve.successRate)}
        hint={
          serve.attempts
            ? `${serve.aces} aces · ${serve.errors} err · ${serve.attempts} int.`
            : "Sin saques registrados"
        }
      />
      {reception ? (
        <StatBlock
          label="Eff. recepción"
          value={formatSkillRate(reception.successRate)}
          hint={
            reception.total
              ? `${reception.good} buenas · ${reception.medium} medias · ${reception.bad} malas · ${reception.errors} err`
              : "Sin recepciones"
          }
        />
      ) : null}
      {defense ? (
        <StatBlock
          label="Eff. defensa"
          value={formatSkillRate(defense.successRate)}
          hint={
            defense.total
              ? `${defense.good} buenas · ${defense.medium} medias · ${defense.bad} malas · ${defense.errors} err`
              : "Sin defensas"
          }
        />
      ) : null}
    </div>
  );
}

export function PossessionCards({
  sideOut,
  breakPoint,
}: {
  sideOut: PossessionStats;
  breakPoint: PossessionStats;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatBlock
        label="Puntos recibiendo"
        value={formatSkillRate(sideOut.rate)}
        hint={
          sideOut.opportunities
            ? `${sideOut.won} de ${sideOut.opportunities} recibiendo`
            : "Sin puntos recibiendo"
        }
      />
      <StatBlock
        label="Puntos con el saque"
        value={formatSkillRate(breakPoint.rate)}
        hint={
          breakPoint.opportunities
            ? `${breakPoint.won} de ${breakPoint.opportunities} con el saque`
            : "Sin puntos con el saque"
        }
      />
    </div>
  );
}
