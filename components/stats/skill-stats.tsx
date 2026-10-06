import { Card, CardContent } from "@/components/ui/card";
import {
  attackActionLine,
  blockActionLine,
  defenseActionLine,
  formatAttackEfficiency,
  formatSkillRate,
  receptionActionLine,
  serveActionLine,
  type AttackStats,
  type BlockStats,
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
  block,
  reception,
  defense,
}: {
  attack: AttackStats;
  serve: ServeStats;
  block: BlockStats;
  reception?: ReceptionStats;
  defense?: DefenseStats;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <StatBlock
        label="Eff. ataque"
        value={formatAttackEfficiency(attack.efficiency)}
        hint={attackActionLine(attack)}
      />
      <StatBlock
        label="Acierto saque"
        value={formatSkillRate(serve.successRate)}
        hint={serveActionLine(serve)}
      />
      <StatBlock
        label="Eff. bloqueo"
        value={formatSkillRate(block.efficiency)}
        hint={blockActionLine(block)}
      />
      {reception ? (
        <>
          <StatBlock
            label="% buenas rec"
            value={formatSkillRate(reception.positiveRate)}
            hint={
              reception.total
                ? `${reception.good} buenas · ${reception.medium} medias · ${reception.total} rec.`
                : receptionActionLine(reception)
            }
          />
          <StatBlock
            label="% malas rec"
            value={formatSkillRate(reception.negativeRate)}
            hint={
              reception.total
                ? `${reception.bad} malas · ${reception.errors} errores · ${reception.total} rec.`
                : receptionActionLine(reception)
            }
          />
        </>
      ) : null}
      {defense ? (
        <>
          <StatBlock
            label="% buenas def"
            value={formatSkillRate(defense.positiveRate)}
            hint={
              defense.total
                ? `${defense.good} buenas · ${defense.medium} medias · ${defense.total} def.`
                : defenseActionLine(defense)
            }
          />
          <StatBlock
            label="% malas def"
            value={formatSkillRate(defense.negativeRate)}
            hint={
              defense.total
                ? `${defense.bad} malas · ${defense.errors} errores · ${defense.total} def.`
                : defenseActionLine(defense)
            }
          />
        </>
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
