"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { courtLabel, refereeLabel } from "@/lib/match-venue";
import { cn } from "@/lib/utils";

function placeLinks(location: string) {
  const query = encodeURIComponent(location.trim());
  return [
    {
      label: "Google Maps",
      href: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
    },
    {
      label: "Waze",
      href: `https://waze.com/ul?q=${query}&navigate=yes`,
    },
    {
      label: "Mapas",
      href: `https://maps.apple.com/?daddr=${query}`,
    },
  ];
}

export function MatchVenueLine({
  location,
  court,
  referees,
  className,
  align = "center",
}: {
  location?: string | null;
  court?: string | null;
  referees?: string | null;
  className?: string;
  align?: "center" | "start";
}) {
  const place = location?.trim() ?? "";
  const courtText = courtLabel(court);
  const officials = refereeLabel(referees);
  if (!place && !courtText && !officials) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        align === "center" ? "items-center text-center" : "items-start text-left"
      )}
    >
      {place ? <MatchPlaceLink location={place} className={cn("text-xs", className)} /> : null}
      {courtText || officials ? (
        <p className="text-[11px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
          {[courtText, officials].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

export function MatchPlaceLink({
  location,
  className,
}: {
  location: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const place = location.trim();
  if (!place) return null;

  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex max-w-full items-center gap-1 text-left font-medium text-[#0B1F3A] underline decoration-[#0B1F3A]/40 underline-offset-2 dark:text-sky-300 dark:decoration-sky-300/40",
          className
        )}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="[overflow-wrap:anywhere]">{place}</span>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Cómo llegar</SheetTitle>
            <SheetDescription>{place}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-2">
            {placeLinks(place).map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center rounded-2xl border bg-card text-sm font-semibold shadow-sm transition-colors hover:bg-secondary"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
