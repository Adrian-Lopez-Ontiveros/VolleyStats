"use client";

import { useMemo, useState } from "react";
import { firstName } from "@/lib/court";
import { cn, formatJersey } from "@/lib/utils";
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
  rec: "bg-sky-500",
  saq: "bg-violet-500",
  ata: "bg-amber-400 text-amber-950",
  blo: "bg-emerald-500",
  def: "bg-rose-500",
};

const TONE_CLASS: Record<SkillOption["tone"], string> = {
  point: "text-emerald-300",
  good: "text-sky-300",
  mid: "text-amber-300",
  poor: "text-orange-300",
  error: "text-rose-400",
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
  const columns = useMemo(() => skillOrder(serving, false), [serving]);

  if (players.length === 0) {
    return (
      <p className="rounded-2xl bg-[#16182a] px-4 py-6 text-center text-sm text-white/70">
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
    <div className="overflow-hidden rounded-2xl bg-[#16182a] text-white shadow-card">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-white/70">
          {teamName}
          <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white">
            {serving ? "Saca" : "Recibe"}
          </span>
        </p>
        <p className="shrink-0 text-[10px] text-white/40">+ punto/buena · = cont/media · − error</p>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[34rem]">
          {players.map((player) => {
            const libero = player.position === "libero";
            const skills = skillOrder(serving, libero);
            return (
              <div
                key={player.id}
                className="grid grid-cols-[4.5rem_repeat(5,minmax(0,1fr))] border-t border-white/10"
              >
                <div className="flex items-center gap-2 px-2 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-500 text-xs font-black">
                    {player.jersey_number ?? "·"}
                  </span>
                  <span className="min-w-0 truncate text-xs font-semibold leading-tight">
                    {firstName(player.full_name)}
                    <span className="block text-[10px] font-medium text-white/40">
                      {formatJersey(player.jersey_number)}
                    </span>
                  </span>
                </div>
                {columns.map((skillId) => {
                  const skill = SKILLS[skillId];
                  const visible = skills.includes(skillId);
                  return (
                    <div key={skillId} className="border-l border-white/10 p-1">
                      <div
                        className={cn(
                          "mb-1 rounded px-1 py-0.5 text-center text-[10px] font-black tracking-wide",
                          SKILL_HEADER[skillId],
                          !visible && "opacity-30"
                        )}
                      >
                        {skill.header}
                      </div>
                      {visible ? (
                        <div className="grid grid-cols-2 gap-0.5">
                          {skill.options.map((option) => {
                            const active =
                              flash?.playerId === player.id && flash.type === option.type;
                            return (
                              <button
                                key={option.type}
                                type="button"
                                disabled={disabled}
                                title={`${skill.label}: ${option.label}`}
                                aria-label={`${firstName(player.full_name)} · ${skill.label} ${option.label}`}
                                onClick={() => tap(player, option)}
                                className={cn(
                                  "flex h-8 items-center justify-center rounded-md text-sm font-black tabular-nums transition-colors disabled:opacity-40",
                                  TONE_CLASS[option.tone],
                                  active
                                    ? "bg-amber-400 text-amber-950 ring-2 ring-amber-200"
                                    : "bg-white/5 hover:bg-white/10"
                                )}
                              >
                                {option.symbol}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-[4.25rem]" />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
