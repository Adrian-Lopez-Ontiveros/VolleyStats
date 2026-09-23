"use client";

import { useState } from "react";
import { CalendarDays, List, Trophy } from "lucide-react";
import { SeasonCalendar } from "@/components/matches/season-calendar";
import { EmptyState } from "@/components/empty-state";
import { MatchCard } from "@/components/matches/match-card";
import type { MatchWithTeams } from "@/lib/types";

export function MatchViews({
  matches,
  linked = true,
  empty = "Todavía no hay partidos.",
}: {
  matches: MatchWithTeams[];
  linked?: boolean;
  empty?: string;
}) {
  const [view, setView] = useState<"list" | "calendar">("list");

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        <button
          type="button"
          onClick={() => setView("list")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold ${
            view === "list" ? "bg-card shadow-sm" : "text-muted-foreground"
          }`}
        >
          <List className="h-3.5 w-3.5" />
          Lista
        </button>
        <button
          type="button"
          onClick={() => setView("calendar")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold ${
            view === "calendar" ? "bg-card shadow-sm" : "text-muted-foreground"
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Calendario
        </button>
      </div>

      {matches.length === 0 ? (
        <EmptyState icon={Trophy} title="Sin partidos" description={empty} />
      ) : view === "calendar" ? (
        <SeasonCalendar matches={matches} linked={linked} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} href={linked ? undefined : null} />
          ))}
        </div>
      )}
    </>
  );
}
