"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { POSITION_LABELS } from "@/lib/constants";
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
  rec: "bg-sky-100 text-sky-950",
  saq: "bg-violet-100 text-violet-950",
  ata: "bg-amber-100 text-amber-950",
  blo: "bg-emerald-100 text-emerald-950",
  def: "bg-rose-100 text-rose-950",
};

const TONE_CLASS: Record<SkillOption["tone"], string> = {
  point: "border-emerald-300 bg-emerald-50 text-emerald-900",
  good: "border-sky-300 bg-sky-50 text-sky-900",
  mid: "border-amber-300 bg-amber-50 text-amber-900",
  poor: "border-orange-200 bg-orange-50 text-orange-900",
  error: "border-rose-300 bg-rose-50 text-rose-900",
};

function skillOrder(serving: boolean, isLibero: boolean): SkillId[] {
  if (isLibero) return serving ? ["def", "rec"] : ["rec", "def"];
  return serving ? ["saq", "ata", "blo", "def", "rec"] : ["rec", "saq", "ata", "blo", "def"];
}

export function LiveStatPad({
  teamName,
  serving,
  players,
  disabled,
  onAction,
}: {
  teamName: string;
  serving: boolean;
  players: PadPlayer[];
  disabled?: boolean;
  onAction: (player: PadPlayer, pointType: PointType) => void;
}) {
  const [flash, setFlash] = useState<{ playerId: string; type: PointType } | null>(null);
  const teamSkills = useMemo(() => skillOrder(serving, false), [serving]);

  if (players.length === 0) {
    return (
      <p className="rounded-2xl border bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-card">
        No hay jugadoras en pista para {teamName}.
      </p>
    );
  }

  function tap(player: PadPlayer, option: SkillOption) {
    if (disabled) return;
    setFlash({ playerId: player.id, type: option.type });
    window.setTimeout(() => setFlash(null), 450);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(12);
    }
    onAction(player, option.type);
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/60 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{teamName}</p>
          <p className="text-[11px] text-muted-foreground">
            {serving ? "Saca" : "Recibe"} · + punto/buena · = cont/media · − error
          </p>
        </div>
        <Badge variant={serving ? "accent" : "secondary"}>{serving ? "Saque" : "Recepción"}</Badge>
      </div>
      <ul>
        {players.map((player) => {
          const libero = player.position === "libero";
          const skills = skillOrder(serving, libero);
          const name = player.full_name;
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
                  </p>
                </div>
                {libero ? <Badge variant="secondary">Líbero</Badge> : null}
              </div>
              <div
                className={cn(
                  "grid gap-2 px-3 py-3",
                  skills.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-5"
                )}
              >
                {(libero ? skills : teamSkills).map((skillId) => {
                  const skill = SKILLS[skillId];
                  return (
                    <div key={skillId} className="min-w-0">
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
                              disabled={disabled}
                              title={`${skill.label}: ${option.label}`}
                              aria-label={`${name} · ${skill.label} ${option.label}`}
                              onClick={() => tap(player, option)}
                              className={cn(
                                "flex h-10 flex-col items-center justify-center rounded-xl border text-sm font-black leading-none shadow-sm transition-colors disabled:opacity-40",
                                TONE_CLASS[option.tone],
                                active && "border-accent bg-accent text-accent-foreground ring-2 ring-accent/40"
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
