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

export type ErrorMatchHit = {
  matchId: string | null;
  label: string;
  count: number;
};

export type ErrorBreakdownRow = {
  type: PointType;
  label: string;
  short?: string;
  count: number;
  matches: ErrorMatchHit[];
};

/** Desglose de errores propios por tipo, ordenado por conteo desc. */
export function errorBreakdownFromEvents(
  events: { point_type: PointType; match_id?: string | null }[],
  matchLabel?: (matchId: string) => string
): ErrorBreakdownRow[] {
  const counts = new Map<PointType, number>();
  const byMatch = new Map<PointType, Map<string, number>>();
  for (const event of events) {
    if (!isOwnErrorType(event.point_type)) continue;
    counts.set(event.point_type, (counts.get(event.point_type) ?? 0) + 1);
    const matchKey = event.match_id || "";
    const bucket = byMatch.get(event.point_type) ?? new Map<string, number>();
    bucket.set(matchKey, (bucket.get(matchKey) ?? 0) + 1);
    byMatch.set(event.point_type, bucket);
  }

  return OWN_ERROR_BREAKDOWN_ORDER.filter((type) => (counts.get(type) ?? 0) > 0)
    .map((type) => {
      const meta = POINT_TYPE_META[type];
      const matches = [...(byMatch.get(type) ?? new Map()).entries()]
        .map(([id, count]) => ({
          matchId: id || null,
          label: id ? (matchLabel?.(id) ?? "Partido") : "Sin partido",
          count,
        }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"));
      return {
        type,
        label: meta.label,
        short: meta.short,
        count: counts.get(type) ?? 0,
        matches,
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
