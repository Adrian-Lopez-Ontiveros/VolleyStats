"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { REWARD_BY_ID } from "@/lib/game";
import type { CheckinResult } from "@/lib/types";

export function CheckinToaster({ result }: { result: CheckinResult | null }) {
  const seen = useRef(false);

  useEffect(() => {
    if (!result?.claimed || seen.current) return;
    seen.current = true;
    toast.success(`Racha de ${result.streak} ${result.streak === 1 ? "día" : "días"} · +${result.xp_gained} XP`);
    if (result.leveled_up) {
      toast.success(`¡Subes a nivel ${result.level}!`);
    }
    for (const id of result.unlocked) {
      const reward = REWARD_BY_ID.get(id);
      if (reward) toast.message(`Recompensa: ${reward.label}`);
    }
  }, [result]);

  return null;
}
