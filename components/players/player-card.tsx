"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { cn, initials } from "@/lib/utils";
import { POSITION_LABELS } from "@/lib/constants";
import {
  CARD_STAT_KEYS,
  CARD_STAT_META,
  DEFAULT_PHOTO_FRAME,
  POSITION_SHORT,
  calculateCardRating,
  cardPosition,
  cardTier,
  clampPhotoFocus,
  resolveCardName,
  statValueTone,
  type CardPhotoFrame,
} from "@/lib/player-card";
import type { CardNameMode, PlayerCardStats, PlayerPosition } from "@/lib/types";

export type PlayerCardView = {
  fullName: string;
  jerseyNumber?: number | null;
  rosterPosition?: PlayerPosition | null;
  cardPosition?: PlayerPosition | null;
  photoUrl?: string | null;
  photoFrame?: CardPhotoFrame;
  nameMode?: CardNameMode | null;
  displayName?: string | null;
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
  onPhotoFrameChange,
}: {
  data: PlayerCardView;
  captureId?: string;
  className?: string;
  onPhotoFrameChange?: (frame: CardPhotoFrame) => void;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const photoBoxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    fx: number;
    fy: number;
  } | null>(null);

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
  const shownName = resolveCardName(data.fullName, data.nameMode, data.displayName);
  const photo = !photoFailed && data.photoUrl ? data.photoUrl : null;
  const logo = !logoFailed && data.teamLogoUrl ? data.teamLogoUrl : null;
  const mark = initials(data.teamName || data.fullName).slice(0, 2);
  const frame = data.photoFrame ?? DEFAULT_PHOTO_FRAME;
  const canDrag = Boolean(onPhotoFrameChange && photo);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!canDrag || !onPhotoFrameChange) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      fx: frame.x,
      fy: frame.y,
    };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.id !== event.pointerId || !onPhotoFrameChange) {
      return;
    }
    const box = photoBoxRef.current?.getBoundingClientRect();
    if (!box?.width || !box.height) return;
    const dx = ((event.clientX - dragRef.current.x) / box.width) * 100;
    const dy = ((event.clientY - dragRef.current.y) / box.height) * 100;
    onPhotoFrameChange({
      ...frame,
      x: clampPhotoFocus(dragRef.current.fx - dx),
      y: clampPhotoFocus(dragRef.current.fy - dy),
    });
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  }

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
            <div
              ref={photoBoxRef}
              className={cn(
                "absolute inset-x-0 top-0 bottom-[7.6rem] overflow-hidden",
                canDrag && (dragging ? "cursor-grabbing" : "cursor-grab")
              )}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={canDrag ? { touchAction: "none" } : undefined}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt={data.fullName}
                  draggable={false}
                  crossOrigin="anonymous"
                  className="h-full w-full select-none object-cover"
                  style={{
                    objectPosition: `${frame.x}% ${frame.y}%`,
                    transform: frame.zoom > 1 ? `scale(${frame.zoom})` : undefined,
                    transformOrigin: `${frame.x}% ${frame.y}%`,
                  }}
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

            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-3 pt-3">
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
                <p
                  className={cn(
                    "truncate font-black uppercase text-white",
                    shownName.length > 16
                      ? "text-[11px] tracking-[0.08em]"
                      : "text-[13px] tracking-[0.16em]"
                  )}
                >
                  {shownName}
                </p>
              </div>

              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 px-1 text-[11px] font-bold uppercase tracking-wide">
                {CARD_STAT_KEYS.map((key) => {
                  const value = data.stats?.[key];
                  return (
                    <div key={key} className="flex items-baseline gap-1.5">
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