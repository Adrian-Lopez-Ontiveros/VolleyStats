import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BoxScoreCard } from "@/components/matches/box-score";
import { ShareBoxScore } from "@/components/matches/share-box-score";
import { RotationSummaryCards, RotationTable } from "@/components/stats/rotation-table";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/query-error";
import { requireViewer } from "@/lib/auth";
import { buildBoxScore } from "@/lib/box-score";
import { MATCH_EVENT_SELECT, MATCH_WITH_TEAMS_SELECT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { MatchEventWithPlayer, MatchWithTeams } from "@/lib/types";

export const metadata: Metadata = { title: "Box score" };

export default async function MatchBoxScorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireViewer();
  const supabase = await createClient();

  const [{ data: match, error: matchError }, { data: events }] = await Promise.all([
    supabase.from("matches").select(MATCH_WITH_TEAMS_SELECT as "*").eq("id", id).maybeSingle(),
    supabase
      .from("match_events")
      .select(MATCH_EVENT_SELECT as "*")
      .eq("match_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (matchError) {
    return <QueryError message={`No se pudo cargar el partido: ${matchError.message}`} />;
  }
  if (!match) notFound();

  const typedMatch = match as MatchWithTeams;
  const typedEvents = (events ?? []) as MatchEventWithPlayer[];
  const box = buildBoxScore(typedMatch, typedEvents);
  const fileName = `fuenlastats-${typedMatch.home_team.short_name || "local"}-${typedMatch.away_team.short_name || "visitante"}`;

  return (
    <div className="space-y-4">
      <div className="print-hidden flex items-center justify-between gap-3">
        <Button asChild size="sm" variant="outline">
          <Link href={`/partidos/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Partido
          </Link>
        </Button>
      </div>

      {typedEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay acciones para generar el box score.
        </p>
      ) : (
        <>
          <div className="print-hidden">
            <ShareBoxScore captureId="share-box-score" fileName={fileName} />
          </div>
          <BoxScoreCard data={box} captureId="share-box-score" />
          <section className="print-hidden space-y-3">
            <h2 className="text-lg font-semibold">Rotaciones de {box.clubLabel}</h2>
            <RotationSummaryCards rows={box.clubRotations} />
            <RotationTable rows={box.clubRotations} />
          </section>
        </>
      )}
    </div>
  );
}
