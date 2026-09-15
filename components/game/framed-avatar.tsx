import { FRAME_CLASS } from "@/lib/game";
import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const SIZES = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
} as const;

export function FramedAvatar({
  name,
  url,
  frameId,
  size = "md",
  className,
}: {
  name: string;
  url?: string | null;
  frameId?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const frame = frameId ? FRAME_CLASS[frameId] : null;

  return (
    <div className={cn("shrink-0 rounded-full", SIZES[size], frame, className)}>
      <Avatar className="h-full w-full">
        <AvatarImage src={url ?? undefined} alt={name} />
        <AvatarFallback className={size === "xl" ? "text-2xl" : undefined}>{initials(name)}</AvatarFallback>
      </Avatar>
    </div>
  );
}
