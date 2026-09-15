"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Medal, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";
import { equipReward } from "@/lib/actions/game";
import { GAME_REWARDS, type GameReward } from "@/lib/game";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UserProgress } from "@/lib/types";

export function RewardsDisclosure({
  unlockedIds,
  progress,
}: {
  unlockedIds: string[];
  progress: UserProgress;
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
      {open ? <RewardsGrid unlockedIds={unlockedIds} progress={progress} /> : null}
    </section>
  );
}

export function RewardsGrid({
  unlockedIds,
  progress,
}: {
  unlockedIds: string[];
  progress: UserProgress;
}) {
  const unlocked = new Set(unlockedIds);
  const groups: { kind: GameReward["kind"]; title: string }[] = [
    { kind: "title", title: "Títulos" },
    { kind: "frame", title: "Marcos" },
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
                equipped={
                  progress.equipped_title === reward.id || progress.equipped_frame === reward.id
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
}: {
  reward: GameReward;
  unlocked: boolean;
  equipped: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const Icon = reward.kind === "title" ? Tag : reward.kind === "frame" ? Sparkles : Medal;
  const canEquip = unlocked && (reward.kind === "title" || reward.kind === "frame");

  async function onEquip() {
    setPending(true);
    const result = await equipReward(reward.id);
    setPending(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success(`Equipado: ${reward.label}`);
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
        {canEquip ? (
          <Button
            type="button"
            size="sm"
            variant={equipped ? "secondary" : "outline"}
            className="mt-2 h-8"
            disabled={pending || equipped}
            onClick={onEquip}
          >
            {equipped ? "En uso" : pending ? "Equipando..." : "Equipar"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
