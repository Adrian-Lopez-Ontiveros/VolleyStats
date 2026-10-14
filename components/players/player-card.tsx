"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { cn, initials } from "@/lib/utils";
import { POSITION_LABELS } from "@/lib/constants";
import {
  DEFAULT_PHOTO_FRAME,
  POSITION_SHORT,
  calculateCardRating,
  cardPosition,
  cardSkin,
  cardStatSlots,
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
  cardStyle?: string | null;
};

const TIER_FRAME: Record<ReturnType<typeof cardTier>, string> = {
  gold: "player-card-gold shadow-[0_18px_40px_-16px_rgba(232,185,35,0.7)]",
  rare: "player-card-rare shadow-[0_18px_40px_-16px_rgba(249,115,22,0.55)]",
  silver: "player-card-silver shadow-[0_18px_40px_-16px_rgba(100,116,139,0.45)]",
  bronze: "player-card-bronze shadow-[0_18px_40px_-16px_rgba(11,31,58,0.45)]",
};

const SIDE_FLAMES = [
  { top: "0%", width: 52, height: 64, tilt: -16, delay: "0s", duration: "0.42s" },
  { top: "18%", width: 40, height: 50, tilt: 12, delay: "0.11s", duration: "0.56s" },
  { top: "34%", width: 58, height: 72, tilt: -8, delay: "0.23s", duration: "0.38s" },
  { top: "52%", width: 44, height: 56, tilt: 18, delay: "0.07s", duration: "0.62s" },
  { top: "70%", width: 48, height: 58, tilt: -14, delay: "0.19s", duration: "0.48s" },
  { top: "86%", width: 36, height: 46, tilt: 8, delay: "0.31s", duration: "0.52s" },
] as const;

const RISING_FLAMES = [
  { delay: "0s", duration: "1.25s", width: 42, height: 52, tilt: -10 },
  { delay: "0.16s", duration: "1.45s", width: 30, height: 40, tilt: 14 },
  { delay: "0.32s", duration: "1.15s", width: 50, height: 60, tilt: -18 },
  { delay: "0.48s", duration: "1.35s", width: 28, height: 36, tilt: 6 },
  { delay: "0.64s", duration: "1.5s", width: 46, height: 56, tilt: -4 },
  { delay: "0.8s", duration: "1.2s", width: 34, height: 44, tilt: 16 },
  { delay: "0.96s", duration: "1.4s", width: 52, height: 62, tilt: -12 },
  { delay: "1.1s", duration: "1.28s", width: 32, height: 42, tilt: 9 },
] as const;

const EMBERS = [
  { delay: "0s", duration: "0.85s", bottom: "4%" },
  { delay: "0.2s", duration: "1.1s", bottom: "24%" },
  { delay: "0.38s", duration: "0.75s", bottom: "48%" },
  { delay: "0.55s", duration: "1s", bottom: "10%" },
  { delay: "0.72s", duration: "0.9s", bottom: "66%" },
  { delay: "0.9s", duration: "1.15s", bottom: "36%" },
] as const;

function FlameTongue({ delay, duration }: { delay: string; duration: string }) {
  return (
    <svg
      viewBox="0 0 90 64"
      className="player-card-flame"
      style={{ animationDelay: delay, animationDuration: duration }}
    >
      <path
        fill="#c2410c"
        d="M86 12C56 2 34 16 20 14C10 12 1 24 9 33C1 39 10 52 26 49C42 62 66 54 86 56C66 46 74 34 62 28C74 22 70 15 86 12Z"
      />
      <path
        fill="#f97316"
        d="M74 16C50 8 32 20 22 20C12 20 6 30 14 36C8 42 18 50 32 47C46 56 62 48 74 50C60 42 66 32 74 26C66 22 70 18 74 16Z"
      />
      <path
        fill="#fde047"
        d="M48 24C34 18 20 28 18 34C12 40 24 48 36 44C28 36 34 28 48 24Z"
      />
      <path fill="#fff7c2" d="M30 30C22 28 14 34 16 38C20 42 30 40 32 36C34 33 32 31 30 30Z" />
    </svg>
  );
}

function flameSlotStyle(angle: number, delay: string, duration: string, top: string, width: number, height: number): CSSProperties {
  return {
    top,
    width,
    height,
    animationDelay: delay,
    animationDuration: duration,
    "--flame-tilt": `${angle}deg`,
  } as CSSProperties;
}

function SideFlames() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <span className="player-card-flame-wash player-card-flame-wash-left" />
      <span className="player-card-flame-wash player-card-flame-wash-right" />
      {SIDE_FLAMES.map((flame) => (
        <span
          key={`left-${flame.top}`}
          className="player-card-flame-slot player-card-flame-slot-left"
          style={flameSlotStyle(flame.tilt, flame.delay, flame.duration, flame.top, flame.width, flame.height)}
        >
          <FlameTongue delay={flame.delay} duration={`${Number.parseFloat(flame.duration) * 0.72}s`} />
        </span>
      ))}
      {SIDE_FLAMES.map((flame) => (
        <span
          key={`right-${flame.top}`}
          className="player-card-flame-slot player-card-flame-slot-right"
          style={flameSlotStyle(180 - flame.tilt, flame.delay, flame.duration, flame.top, flame.width, flame.height)}
        >
          <FlameTongue delay={flame.delay} duration={`${Number.parseFloat(flame.duration) * 0.72}s`} />
        </span>
      ))}
      {RISING_FLAMES.map((flame) => (
        <span
          key={`rise-left-${flame.delay}`}
          className="player-card-flame-rise player-card-flame-rise-left"
          style={{
            width: flame.width,
            height: flame.height,
            animationDelay: flame.delay,
            animationDuration: flame.duration,
          }}
        >
          <span className="player-card-flame-turn" style={{ transform: `rotate(${flame.tilt}deg)` }}>
            <FlameTongue delay={flame.delay} duration="0.34s" />
          </span>
        </span>
      ))}
      {RISING_FLAMES.map((flame) => (
        <span
          key={`rise-right-${flame.delay}`}
          className="player-card-flame-rise player-card-flame-rise-right"
          style={{
            width: flame.width,
            height: flame.height,
            animationDelay: flame.delay,
            animationDuration: flame.duration,
          }}
        >
          <span className="player-card-flame-turn" style={{ transform: `rotate(${180 - flame.tilt}deg)` }}>
            <FlameTongue delay={flame.delay} duration="0.34s" />
          </span>
        </span>
      ))}
      {EMBERS.map((ember) => (
        <span
          key={`ember-left-${ember.delay}`}
          className="player-card-ember player-card-ember-left"
          style={{ bottom: ember.bottom, animationDelay: ember.delay, animationDuration: ember.duration }}
        />
      ))}
      {EMBERS.map((ember) => (
        <span
          key={`ember-right-${ember.delay}`}
          className="player-card-ember player-card-ember-right"
          style={{ bottom: ember.bottom, animationDelay: ember.delay, animationDuration: ember.duration }}
        />
      ))}
    </div>
  );
}

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
  const skin = cardSkin(data.cardStyle);
  const isLider = data.cardStyle === "card_lider";
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
      className={cn(
        "relative w-full overflow-visible",
        isLider ? "max-w-[352px] px-9" : "max-w-[280px]",
        className
      )}
      aria-label={`Cromo de ${data.fullName}`}
    >
      <div className="relative">
      {isLider ? <SideFlames /> : null}
      <div className={cn("relative z-[1] rounded-[1.35rem] p-[3px]", skin?.frame ?? TIER_FRAME[tier])}>
        <div
          className={cn(
            "relative overflow-hidden rounded-[1.2rem] text-white",
            skin?.surface ?? "player-card-surface"
          )}
        >
          <div className="player-card-shine pointer-events-none absolute inset-0 z-20" />
          <div className="relative w-full" style={{ paddingBottom: "140%" }}>
            <div className="absolute inset-0">
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
            </div>

            <div
              className={cn(
                "player-card-photo-fade pointer-events-none absolute inset-x-0 bottom-0 z-[6]",
                isLider && "player-card-photo-fade-lider"
              )}
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-3 pt-3">
              <div className="min-w-[4.5rem] rounded-xl bg-[#0b1f3a]/80 px-2 py-1.5">
                <p className="font-black leading-none tracking-tight [font-variant-numeric:tabular-nums]">
                  <span className="text-[2.6rem]">{rating ?? "—"}</span>
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[11px] font-extrabold uppercase tracking-[0.18em]",
                    skin?.accent ?? "text-orange-300"
                  )}
                >
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
              <div
                className={cn(
                  "rounded-xl px-2 py-1.5 text-center shadow-lg",
                  skin?.nameBar ?? "bg-gradient-to-r from-orange-500 to-orange-600"
                )}
              >
                <p
                  className={cn(
                    "truncate font-black uppercase",
                    skin?.nameText ?? "text-white",
                    shownName.length > 16
                      ? "text-[11px] tracking-[0.08em]"
                      : "text-[13px] tracking-[0.16em]"
                  )}
                >
                  {shownName}
                </p>
              </div>

              <dl className="mx-auto mt-2 grid w-max grid-cols-2 gap-x-5 gap-y-[3px] text-[11px] font-bold uppercase">
                {cardStatSlots(position).map((slot) => {
                  const value = data.stats?.[slot.key];
                  return (
                    <div
                      key={slot.key}
                      className="grid grid-cols-[2.35rem_1.45rem] items-center justify-items-center"
                    >
                      <dt className="tracking-wider text-white/55">{slot.short}</dt>
                      <dd
                        className={cn(
                          "tracking-normal [font-variant-numeric:tabular-nums]",
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
      </div>
      </div>
    </article>
  );
}