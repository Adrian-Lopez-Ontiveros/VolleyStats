"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({
  href = "/partidos",
  label = "Volver",
}: {
  href?: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="shrink-0"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(href);
      }}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
