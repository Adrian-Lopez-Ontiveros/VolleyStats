import { cn } from "@/lib/utils";
import {
  BOARD_GEAR_META,
  isGearKind,
  type BoardGearKind,
  type BoardPiece,
} from "@/lib/board";

export function CourtLines({ uid = "court" }: { uid?: string }) {
  const wood = `${uid}-wood`;
  const grain = `${uid}-grain`;
  return (
    <svg viewBox="0 0 90 140" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={wood} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2a45d" />
          <stop offset="45%" stopColor="#c47b36" />
          <stop offset="100%" stopColor="#a86228" />
        </linearGradient>
        <pattern id={grain} width="90" height="10" patternUnits="userSpaceOnUse">
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
      <rect width="90" height="140" fill={`url(#${wood})`} />
      <rect width="90" height="140" fill={`url(#${grain})`} />
      <rect x="6" y="6" width="78" height="128" fill="none" stroke="#f7ecd4" strokeWidth="1.6" />
      <rect x="6" y="68.2" width="78" height="3.6" fill="#6b3a16" fillOpacity="0.55" />
      <line x1="6" y1="70" x2="84" y2="70" stroke="#f7ecd4" strokeWidth="2.2" />
      <line x1="6" y1="46.7" x2="84" y2="46.7" stroke="#f7ecd4" strokeWidth="1.15" strokeDasharray="3 2" />
      <line x1="6" y1="93.3" x2="84" y2="93.3" stroke="#f7ecd4" strokeWidth="1.15" strokeDasharray="3 2" />
      <text x="45" y="16" textAnchor="middle" fill="#5c3310" fillOpacity="0.55" fontSize="5" fontWeight="700">
        RIVAL
      </text>
      <text x="45" y="132" textAnchor="middle" fill="#5c3310" fillOpacity="0.55" fontSize="5" fontWeight="700">
        NOSOTROS
      </text>
    </svg>
  );
}

export function BoardPieceVisual({
  piece,
  selected = false,
  compact = false,
}: {
  piece: BoardPiece;
  selected?: boolean;
  compact?: boolean;
}) {
  if (piece.kind === "ball") {
    return (
      <span
        className={cn(
          "block overflow-hidden rounded-full shadow-md",
          compact ? "h-6 w-6" : "h-10 w-10 sm:h-11 sm:w-11",
          selected && "ring-2 ring-white"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/volleyball.png"
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full select-none object-cover"
        />
      </span>
    );
  }

  if (piece.kind === "player") {
    return (
      <span className="flex flex-col items-center">
        <span
          className={cn(
            "flex items-center justify-center rounded-full border-2 font-black tabular-nums shadow-md",
            compact ? "h-7 w-7 text-[9px]" : "h-10 w-10 text-xs sm:h-11 sm:w-11 sm:text-sm",
            piece.team === "us"
              ? "border-white/80 bg-primary text-primary-foreground"
              : "border-white/80 bg-rose-600 text-white",
            selected && "ring-2 ring-white ring-offset-2 ring-offset-[#8b5a2b]"
          )}
        >
          {piece.jersey ?? piece.name.slice(0, 2).toUpperCase()}
        </span>
        {!compact ? (
          <span className="mt-0.5 max-w-16 truncate text-[9px] font-semibold text-white drop-shadow">
            {piece.name}
          </span>
        ) : null}
      </span>
    );
  }

  return <GearMark kind={piece.kind} selected={selected} compact={compact} />;
}

export function GearMark({
  kind,
  selected = false,
  compact = false,
}: {
  kind: BoardGearKind;
  selected?: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex flex-col items-center",
        selected && "rounded-md ring-2 ring-white ring-offset-1 ring-offset-[#8b5a2b]"
      )}
    >
      {kind === "cone" ? (
        <svg
          viewBox="0 0 24 28"
          className={compact ? "h-6 w-5" : "h-8 w-6"}
          aria-hidden
        >
          <polygon points="12,1 22,24 2,24" fill="#f97316" stroke="#9a3412" strokeWidth="1.2" />
          <rect x="3" y="24" width="18" height="3" rx="1" fill="#9a3412" />
          <rect x="7" y="12" width="10" height="2.4" fill="#fff7ed" />
        </svg>
      ) : null}
      {kind === "box" ? (
        <span
          className={cn(
            "block rounded-sm border-2 border-amber-950 bg-amber-700 shadow-sm",
            compact ? "h-5 w-7" : "h-7 w-9"
          )}
          aria-hidden
        >
          <span className="block h-1/3 border-b border-amber-950/50 bg-amber-500/80" />
        </span>
      ) : null}
      {kind === "hoop" ? (
        <span
          className={cn(
            "block rounded-full border-[3px] border-sky-400 bg-sky-300/10 shadow-sm",
            compact ? "h-6 w-6" : "h-8 w-8"
          )}
          aria-hidden
        />
      ) : null}
      {kind === "ladder" ? (
        <span
          className={cn(
            "flex flex-col justify-between border-x-2 border-yellow-300",
            compact ? "h-7 w-4" : "h-9 w-5"
          )}
          aria-hidden
        >
          <span className="h-0.5 bg-yellow-300" />
          <span className="h-0.5 bg-yellow-300" />
          <span className="h-0.5 bg-yellow-300" />
          <span className="h-0.5 bg-yellow-300" />
        </span>
      ) : null}
      {!compact ? (
        <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-white drop-shadow">
          {BOARD_GEAR_META[kind].short}
        </span>
      ) : null}
    </span>
  );
}

export function pieceLabel(piece: BoardPiece) {
  if (piece.kind === "player") return piece.name;
  if (piece.kind === "ball") return "Balón";
  if (isGearKind(piece.kind)) return BOARD_GEAR_META[piece.kind].label;
  return "Pieza";
}
