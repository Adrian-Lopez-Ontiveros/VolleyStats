import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white",
        className
      )}
      aria-hidden
    >
      <Image
        src="/logo.png"
        alt=""
        fill
        sizes="96px"
        className="object-contain"
        priority
      />
    </span>
  );
}
