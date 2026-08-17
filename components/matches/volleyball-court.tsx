"use client";

import { cn, formatJersey } from "@/lib/utils";
import {
  COURT_LAYOUT,
  COURT_POSITION_META,
  firstName,
  type CourtOccupant,
  type CourtPosition,
  type CourtSlots,
} from "@/lib/court";

function jerseyLabel(player: CourtOccupant | null | undefined) {
  if (!player) return "";
  if (player.jersey_number === null || player.jersey_number === undefined) {
    return firstName(player.full_name).slice(0, 2).toUpperCase();
  }
  return String(player.jersey_number);
}

function CourtToken({
  player,
  serving,
  interactive,
  emptyLabel,
  emptyHint,
  onClick,
}: {
  player?: CourtOccupant | null;
  serving?: boolean;
  interactive?: boolean;
  emptyLabel: string;
  emptyHint: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "relative flex h-full min-h-[4.5rem] w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5",
        onClick && "active:scale-[0.98]",
        interactive && !player && "hover:bg-white/10"
      )}
    >
      {player ? (
        <>
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full border-2 text-base font-black tabular-nums shadow-sm sm:h-12 sm:w-12 sm:text-lg",
              serving
                ? "border-amber-300 bg-amber-400 text-amber-950 ring-2 ring-amber-200 ring-offset-2 ring-offset-emerald-800"
                : "border-white/80 bg-primary text-primary-foreground"
            )}
          >
            {jerseyLabel(player)}
          </span>
          <span className="max-w-full truncate text-[10px] font-semibold leading-tight text-white/90">
            {firstName(player.full_name)}
          </span>
          {serving ? (
            <span className="rounded-full bg-amber-400 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-950">
              Saca
            </span>
          ) : null}
        </>
      ) : (
        <>
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-white/45 text-sm font-bold text-white/70 sm:h-12 sm:w-12">
            {emptyLabel}
          </span>
          <span className="text-[10px] font-medium text-white/65">{emptyHint}</span>
        </>
      )}
    </Tag>
  );
}

export function VolleyballCourt({
  slots,
  libero = null,
  serving = false,
  interactive = false,
  onSlotClick,
  onLiberoClick,
  onPlayerClick,
}: {
  slots: CourtSlots;
  libero?: CourtOccupant | null;
  serving?: boolean;
  interactive?: boolean;
  onSlotClick?: (position: CourtPosition) => void;
  onLiberoClick?: () => void;
  onPlayerClick?: (player: CourtOccupant, position: CourtPosition | "libero") => void;
}) {
  function handleSlot(position: CourtPosition) {
    const player = slots[position] ?? null;
    if (player && onPlayerClick) {
      onPlayerClick(player, position);
      return;
    }
    if (interactive && onSlotClick) onSlotClick(position);
  }

  function handleLibero() {
    if (libero && onPlayerClick) {
      onPlayerClick(libero, "libero");
      return;
    }
    if (interactive && onLiberoClick) onLiberoClick();
  }

  const liberoClickable = Boolean((libero && onPlayerClick) || (interactive && onLiberoClick));
  const LiberoTag = liberoClickable ? "button" : "div";

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border border-[#7a451c]/40 bg-[#a86228] shadow-sm">
        <div className="flex items-center justify-center gap-2 bg-zinc-800 px-3 py-1.5">
          <span className="h-1 flex-1 rounded-full bg-zinc-500/80" />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-200">
            Red
          </span>
          <span className="h-1 flex-1 rounded-full bg-zinc-500/80" />
        </div>

        <div className="relative p-2 sm:p-2.5">
          <LineupCourtWood />
          <div className="relative rounded-lg border-2 border-[#f7ecd4]/85">
            {COURT_LAYOUT.map((row, rowIndex) => (
              <div key={row.join("-")}>
                {rowIndex === 1 ? (
                  <div className="relative h-0">
                    <div className="absolute inset-x-0 -top-px border-t-2 border-dashed border-white/75" />
                  </div>
                ) : null}
                <div className="grid grid-cols-3 divide-x-2 divide-white/70">
                  {row.map((position) => {
                    const meta = COURT_POSITION_META[position];
                    const player = slots[position] ?? null;
                    const isServeSpot = position === 1 && serving;
                    const clickable =
                      Boolean(onSlotClick && interactive) || Boolean(player && onPlayerClick);
                    return (
                      <div
                        key={position}
                        className={cn(
                          "relative min-h-[5.5rem] sm:min-h-[6.25rem]",
                          rowIndex === 0 ? "border-b-2 border-white/70" : "",
                          isServeSpot && "bg-amber-300/15"
                        )}
                      >
                        <span className="absolute left-1.5 top-1 text-[10px] font-bold tabular-nums text-white/55">
                          {position}
                        </span>
                        <CourtToken
                          player={player}
                          serving={isServeSpot}
                          interactive={interactive}
                          emptyLabel={String(position)}
                          emptyHint={meta.short}
                          onClick={clickable ? () => handleSlot(position) : undefined}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="relative mt-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-[#f7ecd4]/80">
            Fondo · posición 1 saque
          </p>
        </div>
      </div>

      <LiberoTag
        type={liberoClickable ? "button" : undefined}
        onClick={liberoClickable ? handleLibero : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border bg-card px-3 py-2.5 text-left shadow-sm",
          liberoClickable && "active:scale-[0.99]"
        )}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-accent/60 bg-accent/10 text-sm font-black text-accent">
          {libero ? jerseyLabel(libero) : "L"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-accent">
            Líbero · fuera de pista
          </span>
          <span className="block truncate text-sm font-semibold">
            {libero
              ? `${formatJersey(libero.jersey_number)} ${libero.full_name}`
              : interactive
                ? "Toca para elegir líbero"
                : "Sin líbero"}
          </span>
        </span>
      </LiberoTag>
    </div>
  );
}

function LineupCourtWood() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="lineup-court-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2a45d" />
          <stop offset="45%" stopColor="#c47b36" />
          <stop offset="100%" stopColor="#a86228" />
        </linearGradient>
        <pattern id="lineup-court-grain" width="90" height="10" patternUnits="userSpaceOnUse">
          <path
            d="M0 2.2 C 18 0.6 36 3.4 54 1.8 S 80 3 90 2.4"
            fill="none"
            stroke="#8a4d1d"
            strokeOpacity="0.22"
            strokeWidth="0.7"
          />
          <path
            d="M0 6.8 C 16 8.4 38 5.6 58 7.4 S 78 6.2 90 7"
            fill="none"
            stroke="#f0c48a"
            strokeOpacity="0.16"
            strokeWidth="0.55"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lineup-court-wood)" />
      <rect width="100%" height="100%" fill="url(#lineup-court-grain)" />
    </svg>
  );
}
