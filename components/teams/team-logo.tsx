import { cn, initials } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-11 w-11 text-xs",
  lg: "h-16 w-16 text-lg",
  xl: "h-20 w-20 text-xl",
} as const;

export function TeamLogo({
  name,
  shortName,
  logoUrl,
  size = "md",
  className,
  inverted = false,
}: {
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  inverted?: boolean;
}) {
  const fallback = (shortName || initials(name)).slice(0, 3).toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border font-bold",
        inverted
          ? "border-white/20 bg-white/10 text-white"
          : "border-border bg-secondary text-secondary-foreground",
        SIZE_CLASS[size],
        className
      )}
      aria-hidden
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
      ) : (
        <span className="px-0.5 leading-none">{fallback}</span>
      )}
    </span>
  );
}
