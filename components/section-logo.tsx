import Image from "next/image";
import { cn } from "@/lib/utils";

export function SectionLogo({ src, className }: { src: string; className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white",
        className
      )}
      aria-hidden
    >
      <Image src={src} alt="" fill sizes="96px" className="object-contain p-0.5" />
    </span>
  );
}
