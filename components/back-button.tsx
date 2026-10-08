"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markPartidosReturn, savedPartidosHref } from "@/components/matches/partidos-return";

export function BackButton({
  href = "/partidos",
  label = "Volver",
  restorePartidos = false,
}: {
  href?: string;
  label?: string;
  restorePartidos?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!restorePartidos) return;
    const onPop = () => markPartidosReturn();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [restorePartidos]);

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="shrink-0"
      onClick={() => {
        if (restorePartidos) markPartidosReturn();
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(restorePartidos ? savedPartidosHref() || href : href);
      }}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
