"use client";

import { useEffect, useState } from "react";
import { cn, initials } from "@/lib/utils";
import { POSITION_LABELS } from "@/lib/constants";
import {
  CARD_STAT_KEYS,
  CARD_STAT_META,
  POSITION_SHORT,
  calculateCardRating,
  cardDisplayName,
  cardPosition,
  cardTier,
  statValueTone,
} from "@/lib/player-card";
import type { PlayerCardStats, PlayerPosition } from "@/lib/types";

export type PlayerCardView = {
  fullName: string;
  jerseyNumber?: number | null;
  rosterPosition?: PlayerPosition | null;
  cardPosition?: PlayerPosition | null;
  photoUrl?: string | null;
  teamName?: string | null;
  teamLogoUrl?: string | null;
  stats?: PlayerCardStats | null;
  ratingOverride?: number | null;
};

const TIER_FRAME: Record<ReturnType<typeof cardTier>, string> = {
  gold: "player-card-gold shadow-[0_18px_40px_-16px_rgba(232,185,35,0.7)]",
  rare: "player-card-rare shadow-[0_18px_40px_-16px_rgba(249,115,22,0.55)]",
  silver: "player-card-silver shadow-[0_18px_40px_-16px_rgba(100,116,139,0.45)]",
  bronze: "player-card-bronze shadow-[0_18px_40px_-16px_rgba(11,31,58,0.45)]",
};

export function PlayerCardVisual({
  data,
  captureId,
  className,
}: {
  data: PlayerCardView;
  captureId?: string;
  className?: string;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [data.photoUrl]);

  useEffect(() => {
    setLogoFailed(false);
  }, [data.teamLogoUrl]);
  const position = cardPosition(
    data.cardPosition ? { position: data.cardPosition } : null,
    data.rosterPosition
  );
  const completed = Boolean(data.stats);
  const rating = data.stats
    ? calculateCardRating(data.stats, position, data.ratingOverride)
    : null;
  const tier = cardTier(rating);
  const lastName = cardDisplayName(data.fullName);
  const photo = !photoFailed && data.photoUrl ? data.photoUrl : null;
  const logo = !logoFailed && data.teamLogoUrl ? data.teamLogoUrl : null;
  const mark = initials(data.teamName || data.fullName).slice(0, 2);

  return (
    <article
      id={captureId}
      className={cn("w-full max-w-[280px]", className)}
      aria-label={`Cromo de ${data.fullName}`}
    >
      <div className={cn("rounded-[1.35rem] p-[3px]", TIER_FRAME[tier])}>
        <div className="player-card-surface relative overflow-hidden rounded-[1.2rem] text-white">
          <div className="player-card-shine pointer-events-none absolute inset-0 z-20" />
          <div className="relative aspect-[5/7]">
            <div className="absolute inset-x-0 top-0 bottom-[7.6rem]">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt={data.fullName}
                  crossOrigin="anonymous"
                  className="h-full w-full object-cover object-top"
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <div className="flex h-full items-end justify-center pb-6">
                  <span className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-4xl font-black text-white/80">
                    {initials(data.fullName)}
                  </span>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0b1f3a] to-transparent" />
            </div>

            <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-3 pt-3">
              <div className="min-w-[4.5rem] rounded-xl bg-[#0b1f3a]/80 px-2 py-1.5">
                <p className="font-black leading-none tracking-tight [font-variant-numeric:tabular-nums]">
                  <span className="text-[2.6rem]">{rating ?? "—"}</span>
                </p>
                <p className="mt-0.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-300">
                  {position ? POSITION_SHORT[position] : "POS"}
                </p>
                {data.jerseyNumber != null ? (
                  <p className="mt-1 text-xs font-bold text-white/80">#{data.jerseyNumber}</p>
                ) : null}
              </div>
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white/15 text-[10px] font-bold shadow">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo}
                    alt=""
                    crossOrigin="anonymous"
                    className="h-full w-full bg-white object-contain p-0.5"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  mark
                )}
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-2">
              <div className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-2 py-1.5 text-center shadow-lg">
                <p className="truncate text-[13px] font-black uppercase tracking-[0.16em] text-white">
                  {lastName}
                </p>
              </div>

              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 px-1 text-[11px] font-bold uppercase tracking-wide">
                {CARD_STAT_KEYS.map((key) => {
                  const value = data.stats?.[key];
                  return (
                    <div key={key} className="flex items-baseline justify-between gap-2">
                      <dt className="text-white/55">{CARD_STAT_META[key].short}</dt>
                      <dd
                        className={cn(
                          "[font-variant-numeric:tabular-nums]",
                          value == null ? "text-white/40" : statValueTone(value, true)
                        )}
                      >
                        {value ?? "—"}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">
                <span>{completed ? "FuenlaStats" : "Sin completar"}</span>
                <span className="truncate pl-2">
                  {position ? POSITION_LABELS[position] : data.teamName ?? "Voleibol"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}