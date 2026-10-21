"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IdCard, Lock, Medal, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";
import { equipReward } from "@/lib/actions/game";
import {
  FRAME_NONE,
  GAME_REWARDS,
  rewardProgress,
  type GameReward,
  type RewardStats,
} from "@/lib/game";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UserProgress } from "@/lib/types";

export function RewardsDisclosure({
  unlockedIds,
  progress,
  stats,
}: {
  unlockedIds: string[];
  progress: UserProgress;
  stats: RewardStats;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Ocultar recompensas" : "Ver recompensas"}
      </Button>
      {open ? <RewardsGrid unlockedIds={unlockedIds} progress={progress} stats={stats} /> : null}
    </section>
  );
}

export function RewardsGrid({
  unlockedIds,
  progress,
  stats,
}: {
  unlockedIds: string[];
  progress: UserProgress;
  stats: RewardStats;
}) {
  const unlocked = new Set(unlockedIds);
  const groups: { kind: GameReward["kind"]; title: string }[] = [
    { kind: "title", title: "Títulos" },
    { kind: "frame", title: "Marcos" },
    { kind: "card", title: "Estilos de cromo" },
    { kind: "badge", title: "Insignias" },
  ];

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.kind} className="space-y-2">
          <h3 className="text-sm font-semibold">{group.title}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {GAME_REWARDS.filter((reward) => reward.kind === group.kind).map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                unlocked={unlocked.has(reward.id)}
                goal={rewardProgress(reward.id, stats, unlocked.has(reward.id))}
                equipped={
                  progress.equipped_title === reward.id ||
                  progress.equipped_frame === reward.id ||
                  progress.equipped_card === reward.id
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RewardCard({
  reward,
  unlocked,
  equipped,
  goal,
}: {
  reward: GameReward;
  unlocked: boolean;
  equipped: boolean;
  goal: ReturnType<typeof rewardProgress>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const Icon =
    reward.kind === "title"
      ? Tag
      : reward.kind === "frame"
        ? Sparkles
        : reward.kind === "card"
          ? IdCard
          : Medal;
  const canEquip =
    unlocked && (reward.kind === "title" || reward.kind === "frame" || reward.kind === "card");

  async function onEquip() {
    const clearing = equipped && reward.kind === "frame";
    setPending(true);
    const result = await equipReward(clearing ? FRAME_NONE : reward.id);
    setPending(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success(clearing ? "Marco quitado" : `Equipado: ${reward.label}`);
      router.refresh();
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-3",
        unlocked ? "bg-card" : "bg-secondary/60 opacity-80"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          unlocked ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
        )}
      >
        {unlocked ? <Icon className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">{reward.label}</p>
        <p className="text-xs text-muted-foreground">{unlocked ? reward.description : reward.hint}</p>
        {goal ? (
          <div className="mt-1.5 flex items-center gap-2">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={goal.target}
              aria-valuenow={goal.current}
              aria-label={`Progreso: ${goal.current} de ${goal.target}`}
            >
              <div
                className={cn("h-full rounded-full", goal.done ? "bg-orange-500" : "bg-orange-400/70")}
                style={{ width: `${Math.round((goal.current / goal.target) * 100)}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {goal.current}/{goal.target}
            </span>
          </div>
        ) : null}
        {canEquip ? (
          <Button
            type="button"
            size="sm"
            variant={equipped ? "secondary" : "outline"}
            className="mt-2 h-8"
            disabled={pending || (equipped && reward.kind !== "frame")}
            onClick={onEquip}
          >
            {equipped
              ? reward.kind === "card"
                ? "En el cromo"
                : reward.kind === "frame"
                  ? pending
                    ? "Quitando..."
                    : "Quitar"
                  : "En uso"
              : pending
                ? "Equipando..."
                : reward.kind === "card"
                  ? "Poner en el cromo"
                  : "Equipar"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
