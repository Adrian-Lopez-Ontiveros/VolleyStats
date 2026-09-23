"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, List, Trophy } from "lucide-react";
import { SeasonCalendar } from "@/components/matches/season-calendar";
import { EmptyState } from "@/components/empty-state";
import { MatchCard } from "@/components/matches/match-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MatchWithTeams } from "@/lib/types";

export function MatchViews({
  matches,
  linked = true,
  resetKey,
  preferAll = false,
}: {
  matches: MatchWithTeams[];
  linked?: boolean;
  resetKey: string;
  preferAll?: boolean;
}) {
  const live = useMemo(
    () => matches.filter((match) => match.status === "live"),
    [matches]
  );
  const upcoming = useMemo(
    () => matches.filter((match) => match.status === "scheduled"),
    [matches]
  );
  const past = useMemo(
    () =>
      matches.filter((match) => match.status === "finished" || match.status === "cancelled"),
    [matches]
  );
  const defaultTab = preferAll
    ? "all"
    : live.length
      ? "live"
      : upcoming.length
        ? "upcoming"
        : "all";
  const [tab, setTab] = useState(defaultTab);
  const [view, setView] = useState<"list" | "calendar">("list");

  useEffect(() => {
    setTab(
      preferAll ? "all" : live.length ? "live" : upcoming.length ? "upcoming" : "all"
    );
  }, [resetKey, preferAll, live.length, upcoming.length]);

  const lists = {
    all: { matches, empty: "Todavía no hay partidos." },
    live: { matches: live, empty: "No hay partidos en curso." },
    upcoming: { matches: upcoming, empty: "No hay partidos programados." },
    past: { matches: past, empty: "Aún no hay partidos finalizados." },
  } as const;
  const active = lists[tab as keyof typeof lists] ?? lists.all;

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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="live">En vivo</TabsTrigger>
          <TabsTrigger value="upcoming">Próximo</TabsTrigger>
          <TabsTrigger value="past">Pasado</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {view === "calendar" ? (
            active.matches.length === 0 ? (
              <EmptyState icon={Trophy} title="Sin partidos" description={active.empty} />
            ) : (
              <SeasonCalendar matches={active.matches} linked={linked} />
            )
          ) : active.matches.length === 0 ? (
            <EmptyState icon={Trophy} title="Sin partidos" description={active.empty} />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {active.matches.map((match) => (
                <MatchCard key={match.id} match={match} href={linked ? undefined : null} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
