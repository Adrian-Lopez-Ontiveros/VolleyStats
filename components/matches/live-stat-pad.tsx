"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { POSITION_LABELS } from "@/lib/constants";
import { RALLY_PHASE_LABEL, type RallyPhase } from "@/lib/live-rally";
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
      { type: "serve_in", symbol: "+", label: "Dentro", tone: "good" },
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
  rec: "bg-sky-700 text-white",
  saq: "bg-violet-800 text-white",
  ata: "bg-orange-600 text-white",
  blo: "bg-emerald-800 text-white",
  def: "bg-rose-700 text-white",
};

const TONE_CLASS: Record<SkillOption["tone"], string> = {
  point: "border-emerald-800 bg-emerald-700 text-white",
  good: "border-sky-800 bg-sky-700 text-white",
  mid: "border-amber-700 bg-amber-500 text-amber-950",
  poor: "border-orange-800 bg-orange-600 text-white",
  error: "border-rose-900 bg-rose-700 text-white",
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
  onAction,
}: {
  teamName: string;
  serving: boolean;
  players: PadPlayer[];
  disabled?: boolean;
  phase: RallyPhase;
  serveLocked: boolean;
  serverPlayerId: string | null;
  onAction: (player: PadPlayer, pointType: PointType) => void;
}) {
  const [flash, setFlash] = useState<{ playerId: string; type: PointType } | null>(null);
  const teamSkills = useMemo(() => skillOrder(phase, false), [phase]);
  const orderedPlayers = useMemo(() => {
    if (!serverPlayerId || phase !== "serve") return players;
    const server = players.find((player) => player.id === serverPlayerId);
    if (!server) return players;
    return [server, ...players.filter((player) => player.id !== serverPlayerId)];
  }, [players, serverPlayerId, phase]);

  if (players.length === 0) {
    return (
      <p className="rounded-2xl border bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-card">
        No hay jugadoras en pista para {teamName}.
      </p>
    );
  }

  function canUseServe(player: PadPlayer) {
    if (disabled || !serving || serveLocked) return false;
    if (player.position === "libero") return false;
    if (serverPlayerId && player.id !== serverPlayerId) return false;
    return true;
  }

  function tap(player: PadPlayer, skillId: SkillId, option: SkillOption) {
    if (disabled) return;
    if (skillId === "saq" && !canUseServe(player)) return;
    setFlash({ playerId: player.id, type: option.type });
    window.setTimeout(() => setFlash(null), 280);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(10);
    }
    onAction(player, option.type);
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/60 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{teamName}</p>
          <p className="text-[11px] text-muted-foreground">
            {serving ? "Saca" : "Recibe"} · ahora {RALLY_PHASE_LABEL[phase].toLowerCase()}
          </p>
        </div>
        <Badge variant={phase === "serve" || phase === "attack" ? "accent" : "default"}>
          {RALLY_PHASE_LABEL[phase]}
        </Badge>
      </div>
      <ul>
        {orderedPlayers.map((player) => {
          const libero = player.position === "libero";
          const skills = skillOrder(phase, libero);
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
                {isServer && phase === "serve" ? <Badge variant="accent">Saca</Badge> : null}
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
                    <div
                      key={skillId}
                      className={cn("min-w-0 transition-opacity duration-150", serveBlocked && "opacity-40")}
                    >
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
                                  ? serveLocked
                                    ? "El saque de este punto ya está anotado"
                                    : "Solo puede sacar quien está en zona 1"
                                  : `${skill.label}: ${option.label}`
                              }
                              aria-label={`${name} · ${skill.label} ${option.label}`}
                              onClick={() => tap(player, skillId, option)}
                              className={cn(
                                "flex h-10 flex-col items-center justify-center rounded-xl border text-sm font-black leading-none shadow-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
                                TONE_CLASS[option.tone],
                                active && "border-primary bg-primary text-primary-foreground ring-2 ring-primary/30"
                              )}
                            >
                              <span>{option.symbol}</span>
                              <span className="mt-0.5 text-[9px] font-semibold tracking-wide opacity-90">
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
