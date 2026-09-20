"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { POSITION_LABELS } from "@/lib/constants";
import { RALLY_PHASE_LABEL, nextRallyFromAction, type RallyPhase } from "@/lib/live-rally";
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

function skillOrder(phase: RallyPhase, isLibero: boolean): SkillId[] {
  if (isLibero) {
    if (phase === "receive") return ["rec", "def"];
    return ["def", "rec"];
  }
  switch (phase) {
    case "serve":
      return ["saq", "ata", "blo", "def", "rec"];
    case "receive":
      return ["rec", "ata", "blo", "def", "saq"];
    case "block_def":
      return ["blo", "def", "ata", "rec", "saq"];
    case "attack":
      return ["ata", "blo", "def", "rec", "saq"];
  }
}

export function LiveStatPad({
  teamName,
  serving,
  players,
  disabled,
  phase,
  serveLocked,
  serverPlayerId,
  rallyKey,
  onAction,
}: {
  teamName: string;
  serving: boolean;
  players: PadPlayer[];
  disabled?: boolean;
  phase: RallyPhase;
  serveLocked: boolean;
  serverPlayerId: string | null;
  rallyKey: string;
  onAction: (player: PadPlayer, pointType: PointType) => void;
}) {
  const [flash, setFlash] = useState<{ playerId: string; type: PointType } | null>(null);
  const [rally, setRally] = useState({ phase, serveLocked });

  useEffect(() => {
    setRally({ phase, serveLocked });
  }, [rallyKey, phase, serveLocked]);

  const teamSkills = useMemo(() => skillOrder(rally.phase, false), [rally.phase]);
  const orderedPlayers = useMemo(() => {
    if (!serverPlayerId || rally.phase !== "serve") return players;
    const server = players.find((player) => player.id === serverPlayerId);
    if (!server) return players;
    return [server, ...players.filter((player) => player.id !== serverPlayerId)];
  }, [players, serverPlayerId, rally.phase]);

  if (players.length === 0) {
    return (
      <p className="rounded-2xl border bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-card">
        No hay jugadoras en pista para {teamName}.
      </p>
    );
  }

  function canUseServe(player: PadPlayer) {
    if (disabled || !serving || rally.serveLocked) return false;
    if (player.position === "libero") return false;
    if (serverPlayerId && player.id !== serverPlayerId) return false;
    return true;
  }

  function tap(player: PadPlayer, skillId: SkillId, option: SkillOption) {
    if (disabled) return;
    if (skillId === "saq" && !canUseServe(player)) return;
    setRally((current) => nextRallyFromAction(current, option.type, serving));
    setFlash({ playerId: player.id, type: option.type });
    window.setTimeout(() => setFlash(null), 220);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(8);
    }
    startTransition(() => {
      onAction(player, option.type);
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/60 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{teamName}</p>
          <p className="text-[11px] text-muted-foreground">
            {serving ? "Saca" : "Recibe"} · ahora {RALLY_PHASE_LABEL[rally.phase].toLowerCase()}
          </p>
        </div>
        <Badge variant={rally.phase === "serve" || rally.phase === "attack" ? "accent" : "default"}>
          {RALLY_PHASE_LABEL[rally.phase]}
        </Badge>
      </div>
      <ul>
        {orderedPlayers.map((player) => {
          const libero = player.position === "libero";
          const skills = skillOrder(rally.phase, libero);
          const name = player.full_name;
          const isServer = Boolean(serverPlayerId && player.id === serverPlayerId);
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
                    {isServer && serving ? " · Saca" : ""}
                  </p>
                </div>
                {libero ? <Badge variant="secondary">Líbero</Badge> : null}
                {isServer && rally.phase === "serve" ? <Badge variant="accent">Saca</Badge> : null}
              </div>
              <div
                className={cn(
                  "grid gap-2 px-3 py-3",
                  skills.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-5"
                )}
              >
                {(libero ? skills : teamSkills).map((skillId) => {
                  const skill = SKILLS[skillId];
                  const serveBlocked = skillId === "saq" && !canUseServe(player);
                  return (
                    <div key={skillId} className={cn("min-w-0", serveBlocked && "opacity-40")}>
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
                              disabled={disabled || serveBlocked}
                              title={
                                serveBlocked
                                  ? rally.serveLocked
                                    ? "El saque de este punto ya está anotado"
                                    : "Solo puede sacar quien está en zona 1"
                                  : `${skill.label}: ${option.label}`
                              }
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
