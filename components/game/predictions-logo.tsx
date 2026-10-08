import Image from "next/image";
import { cn } from "@/lib/utils";

export function PredictionsLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white",
        className
      )}
      aria-hidden
    >
      <Image
        src="/predictions-logo.png"
        alt=""
        fill
        sizes="96px"
        className="object-contain p-0.5"
      />
    </span>
  );
}
