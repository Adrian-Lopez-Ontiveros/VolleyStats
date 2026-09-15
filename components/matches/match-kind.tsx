import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function isFriendlyMatch(match: { is_federation?: boolean | null }) {
  return !match.is_federation;
}

export function MatchKindBadge({
  match,
  round,
}: {
  match: { is_federation?: boolean | null };
  round?: string | null;
}) {
  if (isFriendlyMatch(match)) {
    return (
      <Badge className="border-orange-800 bg-orange-500 text-white">Amistoso</Badge>
    );
  }
  return (
    <Badge className="border-violet-800 bg-violet-600 text-white">
      {round ? `Liga FMV · ${round}` : "Liga FMV"}
    </Badge>
  );
}

export function matchSurfaceClass(match: { is_federation?: boolean | null }) {
  return isFriendlyMatch(match)
    ? "border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 via-amber-50 to-white"
    : "border-violet-200/80";
}

export function matchKindLabel(match: { is_federation?: boolean | null; federation_round?: string | null }) {
  if (isFriendlyMatch(match)) return "Amistoso";
  return match.federation_round
    ? `Partido oficial FMV · ${match.federation_round}`
    : "Partido oficial de liga FMV";
}

export function cnMatchCard(match: { is_federation?: boolean | null }, extra?: string) {
  return cn("h-full transition-transform active:scale-[0.99]", matchSurfaceClass(match), extra);
}
