"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
          "inline-flex max-w-full items-center gap-1 text-left font-medium text-accent underline decoration-accent/40 underline-offset-2",
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
