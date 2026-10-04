import { POINT_TYPE_META } from "@/lib/constants";
import { isOwnErrorType } from "@/lib/volleyball";
import type { PointType } from "@/lib/types";

const OWN_ERROR_BREAKDOWN_ORDER: PointType[] = [
  "attack_error",
  "serve_error",
  "reception_error",
  "defense_error",
  "block_error",
  "error",
];

export type ErrorBreakdownRow = {
  type: PointType;
  label: string;
  short?: string;
  count: number;
};

/** Desglose de errores propios por tipo, ordenado por conteo desc. */
export function errorBreakdownFromEvents(
  events: { point_type: PointType }[]
): ErrorBreakdownRow[] {
  const counts = new Map<PointType, number>();
  for (const event of events) {
    if (!isOwnErrorType(event.point_type)) continue;
    counts.set(event.point_type, (counts.get(event.point_type) ?? 0) + 1);
  }

  return OWN_ERROR_BREAKDOWN_ORDER.filter((type) => (counts.get(type) ?? 0) > 0)
    .map((type) => {
      const meta = POINT_TYPE_META[type];
      return {
        type,
        label: meta.label,
        short: meta.short,
        count: counts.get(type) ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (
        OWN_ERROR_BREAKDOWN_ORDER.indexOf(a.type) -
        OWN_ERROR_BREAKDOWN_ORDER.indexOf(b.type)
      );
    });
}
