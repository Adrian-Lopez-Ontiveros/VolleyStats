"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { courtLabel, refereeInitials, refereeList } from "@/lib/match-venue";
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
  const names = refereeList(referees);
  if (!place && !courtText && names.length === 0) return null;

  const refereeWord = names.length === 1 ? "Árbitro" : "Árbitros";
  const dividerText =
    names.length > 0
      ? courtText
        ? `${refereeWord} · ${courtText}`
        : refereeWord
      : courtText;
  const single = names.length === 1;

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        align === "center" ? "items-center text-center" : "items-start text-left"
      )}
    >
      {place ? <MatchPlaceLink location={place} className={cn("text-xs", className)} /> : null}
      {dividerText ? (
        <div
          className="w-full"
          aria-label={names.length > 0 ? `${dividerText}: ${names.join(", ")}` : dividerText}
        >
          <div className="mb-2.5 mt-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#F97316] dark:text-[#FB8A3C]">
              {dividerText}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          {names.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 text-left">
              {names.map((name, index) => (
                <div
                  key={`${index}-${name}`}
                  className={cn(
                    "flex min-w-0 items-center gap-[9px] rounded-[14px] border border-border bg-secondary/60 px-2.5 py-[9px]",
                    single && align === "center" && "col-span-2 w-[calc(50%-4px)] justify-self-center"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[10px] font-extrabold",
                      index % 2 === 0
                        ? "bg-[#FFE4D1] text-[#C2410C] dark:bg-[#4A2A14] dark:text-[#FDBA74]"
                        : "bg-[#DBEAFE] text-[#1D4ED8] dark:bg-[#17305A] dark:text-[#93C5FD]"
                    )}
                  >
                    {refereeInitials(name)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] leading-tight text-muted-foreground">
                      {refereeRole(index)}
                    </div>
                    <div className="text-xs font-bold leading-[1.2] text-foreground [overflow-wrap:anywhere]">
                      {name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function refereeRole(index: number) {
  if (index === 0) return "1.er árbitro";
  if (index === 1) return "2.º árbitro";
  return "Árbitro";
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
