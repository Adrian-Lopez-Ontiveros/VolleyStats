"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { POSITION_LABELS } from "@/lib/constants";
import { isReceptionType, isServeType } from "@/lib/live-rally";
import { cn, formatJersey, initials } from "@/lib/utils";
import type { Player, PointType } from "@/lib/types";

type PadPlayer = Pick<Player, "id" | "full_name" | "jersey_number" | "position">;

type SkillId = "rec" | "saq" | "ata" | "blo" | "def";

type SkillOption = {
  type: PointType;
  symbol: string;
  label: string;
  tone: "good" | "mid" | "poor" | "error" | "point";
};

const SKILLS: Record<
  SkillId,
  { label: string; header: string; options: SkillOption[] }
> = {
  rec: {
    label: "Recepción",
    header: "REC",
    options: [
      { type: "reception_good", symbol: "+", label: "Buena", tone: "good" },
      { type: "reception_medium", symbol: "=", label: "Media", tone: "mid" },
      { type: "reception_bad", symbol: "/", label: "Mala", tone: "poor" },
      { type: "reception_error", symbol: "−", label: "Error", tone: "error" },
    ],
  },
  saq: {
    label: "Saque",
    header: "SAQ",
    options: [
      { type: "ace", symbol: "A", label: "Ace", tone: "point" },
      { type: "serve_in", symbol: "+", label: "Dentro", tone: "mid" },
      { type: "serve_error", symbol: "−", label: "Fuera", tone: "error" },
    ],
  },
  ata: {
    label: "Ataque",
    header: "ATA",
    options: [
      { type: "attack", symbol: "+", label: "Punto", tone: "point" },
      { type: "attack_continuation", symbol: "=", label: "Continuado", tone: "mid" },
      { type: "attack_error", symbol: "−", label: "Error", tone: "error" },
    ],
  },
  blo: {
    label: "Bloqueo",
    header: "BLO",
    options: [
      { type: "block", symbol: "+", label: "Punto", tone: "point" },
      { type: "block_continuation", symbol: "=", label: "Continuado", tone: "mid" },
      { type: "block_touch", symbol: "T", label: "Toque", tone: "poor" },
    ],
  },
  def: {
    label: "Defensa",
    header: "DEF",
    options: [
      { type: "defense_good", symbol: "+", label: "Buena", tone: "good" },
      { type: "defense_medium", symbol: "=", label: "Media", tone: "mid" },
      { type: "defense_bad", symbol: "/", label: "Mala", tone: "poor" },
      { type: "defense_error", symbol: "−", label: "Error", tone: "error" },
    ],
  },
};

const SKILL_HEADER: Record<SkillId, string> = {
  rec: "bg-sky-100 text-sky-800",
  saq: "bg-violet-100 text-violet-800",
  ata: "bg-orange-100 text-orange-800",
  blo: "bg-cyan-100 text-cyan-800",
  def: "bg-slate-200 text-slate-800",
};

const TONE_CLASS: Record<SkillOption["tone"], string> = {
  point: "border-emerald-200 bg-emerald-50 text-emerald-800",
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  mid: "border-amber-200 bg-amber-50 text-amber-900",
  poor: "border-stone-200 bg-stone-100 text-stone-700",
  error: "border-rose-200 bg-rose-50 text-rose-800",
};

function skillOrder(_serving: boolean, isLibero: boolean): SkillId[] {
  if (isLibero) return ["def", "rec"];
  return ["saq", "ata", "def", "blo", "rec"];
}

export function LiveStatPad({
  teamName,
  serving,
  players,
  disabled,
  serveLocked,
  receptionLocked,
  serverPlayerId,
  onAction,
}: {
  teamName: string;
  serving: boolean;
  players: PadPlayer[];
  disabled?: boolean;
  serveLocked: boolean;
  receptionLocked: boolean;
  serverPlayerId: string | null;
  onAction: (player: PadPlayer, pointType: PointType) => void;
}) {
  const [flash, setFlash] = useState<{ playerId: string; type: PointType } | null>(null);
  const [tappedServe, setTappedServe] = useState(false);
  const [tappedRec, setTappedRec] = useState(false);

  useEffect(() => {
    setTappedServe(false);
    setTappedRec(false);
  }, [serving, serveLocked, receptionLocked]);

  const serveIsLocked = serveLocked || tappedServe;
  const recIsLocked = receptionLocked || tappedRec;

  const teamSkills = useMemo(() => skillOrder(serving, false), [serving]);
  const orderedPlayers = useMemo(() => {
    if (!serving || !serverPlayerId) return players;
    const server = players.find((player) => player.id === serverPlayerId);
    if (!server) return players;
    return [server, ...players.filter((player) => player.id !== serverPlayerId)];
  }, [players, serverPlayerId, serving]);

  if (players.length === 0) {
    return (
      <p className="rounded-2xl border bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-card">
        No hay jugadoras en pista para {teamName}.
      </p>
    );
  }

  function canUseServe(player: PadPlayer) {
    if (disabled || !serving || serveIsLocked) return false;
    if (player.position === "libero") return false;
    if (serverPlayerId) return player.id === serverPlayerId;
    return true;
  }

  function canUseReception() {
    if (disabled || serving || recIsLocked) return false;
    return true;
  }

  function skillBlocked(skillId: SkillId, player: PadPlayer) {
    if (skillId === "saq") return !canUseServe(player);
    if (skillId === "rec") return !canUseReception();
    return false;
  }

  function blockReason(skillId: SkillId, player: PadPlayer) {
    if (skillId === "saq") {
      if (!serving) return "El saque solo se anota cuando este equipo saca";
      if (serveIsLocked) return "El saque de este punto ya está anotado";
      if (player.position === "libero") return "La líbero no saca";
      if (serverPlayerId && player.id !== serverPlayerId) {
        return "Solo puede sacar quien está en zona 1";
      }
    }
    if (skillId === "rec") {
      if (serving) return "La recepción solo se anota cuando este equipo recibe";
      if (recIsLocked) return "La recepción de este punto ya está anotada";
    }
    return "";
  }

  function tap(player: PadPlayer, skillId: SkillId, option: SkillOption) {
    if (disabled || skillBlocked(skillId, player)) return;
    if (isServeType(option.type)) setTappedServe(true);
    if (isReceptionType(option.type)) setTappedRec(true);
    setFlash({ playerId: player.id, type: option.type });
    window.setTimeout(() => setFlash(null), 220);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(8);
    }
    onAction(player, option.type);
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/60 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{teamName}</p>
          <p className="text-[11px] text-muted-foreground">
            {serving
              ? "Saca · el saque solo lo anota quien está en zona 1"
              : "Recibe · una recepción por punto"}
          </p>
        </div>
        <Badge variant={serving ? "accent" : "secondary"}>{serving ? "Saque" : "Recepción"}</Badge>
      </div>
      <ul>
        {orderedPlayers.map((player) => {
          const libero = player.position === "libero";
          const skills = skillOrder(serving, libero);
          const name = player.full_name;
          const isServer = Boolean(serving && serverPlayerId && player.id === serverPlayerId);
          return (
            <li key={player.id} className="border-b last:border-b-0">
              <div className="flex items-center gap-3 px-3 pt-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black tabular-nums text-primary-foreground">
                  {player.jersey_number ?? initials(player.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug [overflow-wrap:anywhere]">
                    {name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatJersey(player.jersey_number)}
                    {player.position ? ` · ${POSITION_LABELS[player.position]}` : ""}
                    {isServer ? " · Saca" : ""}
                  </p>
                </div>
                {libero ? <Badge variant="secondary">Líbero</Badge> : null}
                {isServer ? <Badge variant="accent">Saca</Badge> : null}
              </div>
              <div
                className={cn(
                  "grid gap-2 px-3 py-3",
                  skills.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-5"
                )}
              >
                {skills.map((skillId) => {
                  const skill = SKILLS[skillId];
                  const blocked = skillBlocked(skillId, player);
                  return (
                    <div key={skillId} className={cn("min-w-0", blocked && "opacity-40")}>
                      <div
                        className={cn(
                          "mb-1 rounded-lg px-1 py-1 text-center text-[11px] font-bold tracking-wide",
                          SKILL_HEADER[skillId]
                        )}
                      >
                        {skill.header}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {skill.options.map((option) => {
                          const active =
                            flash?.playerId === player.id && flash.type === option.type;
                          return (
                            <button
                              key={option.type}
                              type="button"
                              disabled={disabled || blocked}
                              title={blocked ? blockReason(skillId, player) : `${skill.label}: ${option.label}`}
                              aria-label={`${name} · ${skill.label} ${option.label}`}
                              onClick={() => tap(player, skillId, option)}
                              className={cn(
                                "flex h-10 flex-col items-center justify-center rounded-xl border text-sm font-black leading-none disabled:cursor-not-allowed disabled:opacity-60",
                                TONE_CLASS[option.tone],
                                active && "border-emerald-400 bg-emerald-100 text-emerald-900"
                              )}
                            >
                              <span>{option.symbol}</span>
                              <span className="mt-0.5 text-[9px] font-semibold tracking-wide opacity-80">
                                {option.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
