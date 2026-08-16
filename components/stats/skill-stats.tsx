import { Card, CardContent } from "@/components/ui/card";
import {
  formatAttackEfficiency,
  formatSkillRate,
  type AttackStats,
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
}: {
  attack: AttackStats;
  serve: ServeStats;
  reception?: ReceptionStats;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatBlock
        label="Eff. ataque"
        value={formatAttackEfficiency(attack.efficiency)}
        hint={
          attack.attempts
            ? `(${attack.kills} − ${attack.errors}) / ${attack.attempts}`
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
          label="Recepción buena"
          value={formatSkillRate(reception.goodRate)}
          hint={
            reception.total
              ? `${reception.good} buenas · ${reception.medium} medias · ${reception.bad} malas`
              : "Sin recepciones"
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
        label="Side-out"
        value={formatSkillRate(sideOut.rate)}
        hint={
          sideOut.opportunities
            ? `${sideOut.won} de ${sideOut.opportunities} al recibir`
            : "Sin puntos al recibir"
        }
      />
      <StatBlock
        label="Break-point"
        value={formatSkillRate(breakPoint.rate)}
        hint={
          breakPoint.opportunities
            ? `${breakPoint.won} de ${breakPoint.opportunities} al sacar`
            : "Sin puntos al sacar"
        }
      />
    </div>
  );
}
