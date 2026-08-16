"use client";

import { useState } from "react";
import { resolveTeamLogoUrl } from "@/lib/federation/crests";
import { cn, initials } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-11 w-11 text-xs",
  lg: "h-16 w-16 text-lg",
  xl: "h-20 w-20 text-xl",
} as const;

export function TeamLogo({
  name,
  shortName,
  logoUrl,
  federationTeamId,
  size = "md",
  className,
  inverted = false,
}: {
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  federationTeamId?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  inverted?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : resolveTeamLogoUrl({ logo_url: logoUrl, federation_team_id: federationTeamId });
  const fallback = initials(name || shortName || "").slice(0, 2) || "·";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border font-bold",
        inverted
          ? "border-white/20 bg-white/10 text-white"
          : "border-border bg-secondary text-secondary-foreground",
        SIZE_CLASS[size],
        className
      )}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full bg-white object-contain p-0.5"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="px-0.5 leading-none">{fallback}</span>
      )}
    </span>
  );
}
