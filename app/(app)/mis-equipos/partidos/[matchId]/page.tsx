import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { requirePrivateMember, loadPrivateWorkspace, privateMatchWithTeams } from "@/lib/private-teams-data";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { PrivateMatchScoreForm, PrivateMatchResultEditor } from "@/components/private-teams/private-match-score-form";
import type { Match, Team } from "@/lib/types";

export const metadata: Metadata = { title: "Partido privado" };
export const dynamic = "force-dynamic";
export default async function PrivateMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  await requirePrivateMember();
  const supabase = await createClient();
  const { data } = await supabase.from("matches").select("*").eq("id", matchId).eq("is_private", true).maybeSingle();
  if (!data) notFound();
  const match = data as Match;
  const workspace = await loadPrivateWorkspace(match.private_league_id ?? "");
  if (!workspace.matches.some((item) => item.id === matchId)) notFound();
  const typed = privateMatchWithTeams(match, workspace.teams as Team[]);
  return <div className="mx-auto max-w-2xl space-y-6"><Link href={`/mis-equipos/${match.private_league_id}`} className="text-sm font-medium text-accent hover:underline">← Volver a la liga privada</Link><div><p className="text-sm text-muted-foreground">{format(new Date(match.scheduled_at), "EEEE d MMMM yyyy, HH:mm", { locale: es })}</p><h1 className="mt-2 text-2xl font-black">{typed.home_team.name} <span className="text-accent">{match.home_sets}–{match.away_sets}</span> {typed.away_team.name}</h1></div><Card><CardContent><h2 className="mb-3 font-semibold">Resultado por sets</h2></CardContent><CardContent>{workspace.isOwner ? <PrivateMatchScoreForm match={match} /> : <PrivateMatchResultEditor match={match} />}</CardContent></Card></div>;
}
