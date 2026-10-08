"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { equipReward } from "@/lib/actions/game";
import { FRAME_CLASS, FRAME_NONE, GAME_REWARDS, rewardLabel } from "@/lib/game";
import { cn } from "@/lib/utils";

export function ProfileLook({
  userId,
  name,
  email,
  url,
  initialTitle,
  initialFrame,
  unlockedIds,
  canChoose,
  children,
}: {
  userId: string;
  name: string;
  email: string;
  url?: string | null;
  initialTitle?: string | null;
  initialFrame?: string | null;
  unlockedIds: string[];
  canChoose: boolean;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [titleId, setTitleId] = useState(initialTitle ?? null);
  const [frameId, setFrameId] = useState(
    initialFrame && FRAME_CLASS[initialFrame] ? initialFrame : null
  );
  const [pending, setPending] = useState<string | null>(null);
  const unlocked = new Set(unlockedIds);

  useEffect(() => {
    setTitleId(initialTitle ?? null);
    setFrameId(initialFrame && FRAME_CLASS[initialFrame] ? initialFrame : null);
  }, [initialTitle, initialFrame]);
  const titles = GAME_REWARDS.filter(
    (reward) => reward.kind === "title" && (unlocked.has(reward.id) || reward.id === titleId)
  );
  const frames = GAME_REWARDS.filter(
    (reward) => reward.kind === "frame" && (unlocked.has(reward.id) || reward.id === frameId)
  );
  const title = rewardLabel(titleId);

  async function choose(id: string, kind: "title" | "frame") {
    if (pending) return;
    if (kind === "title" && id === titleId) return;
    if (kind === "frame" && (id === FRAME_NONE ? !frameId : id === frameId)) return;

    const previousTitle = titleId;
    const previousFrame = frameId;
    if (kind === "title") setTitleId(id);
    else setFrameId(id === FRAME_NONE ? null : id);
    setPending(id);

    const result = await equipReward(id);
    setPending(null);
    if ("error" in result) {
      setTitleId(previousTitle);
      setFrameId(previousFrame);
      toast.error(result.error);
      return;
    }
    toast.success(id === FRAME_NONE ? "Marco quitado" : `Equipado: ${rewardLabel(id) ?? "listo"}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <AvatarUpload userId={userId} name={name} url={url} frameId={frameId} />

      <div className="text-center">
        <h1 className="text-2xl font-bold">{name}</h1>
        {title ? (
          <p className="text-sm font-medium text-orange-700 dark:text-orange-200">{title}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>

      {canChoose && (frames.length > 0 || frameId || titles.length > 0) ? (
        <div className="space-y-4">
          {frames.length > 0 || frameId ? (
            <div className="space-y-2">
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Marco
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <LookButton
                  label="Sin marco"
                  pressed={!frameId}
                  pending={pending !== null}
                  onClick={() => choose(FRAME_NONE, "frame")}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary ring-1 ring-border">
                    <Ban className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                </LookButton>
                {frames.map((reward) => (
                  <LookButton
                    key={reward.id}
                    label={reward.label}
                    pressed={frameId === reward.id}
                    pending={pending !== null}
                    onClick={() => choose(reward.id, "frame")}
                  >
                    <span className={cn("block h-8 w-8 rounded-full", FRAME_CLASS[reward.id])} />
                  </LookButton>
                ))}
              </div>
            </div>
          ) : null}

          {titles.length > 0 ? (
            <div className="space-y-2">
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Título
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {titles.map((reward) => {
                  const selected = titleId === reward.id;
                  return (
                    <button
                      key={reward.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={pending !== null}
                      onClick={() => choose(reward.id, "title")}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
                        selected
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-100"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {reward.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {children}
    </div>
  );
}

function LookButton({
  label,
  pressed,
  pending,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  pending: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      disabled={pending}
      onClick={onClick}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-60",
        pressed && "ring-2 ring-accent ring-offset-2 ring-offset-background"
      )}
    >
      {children}
    </button>
  );
}
