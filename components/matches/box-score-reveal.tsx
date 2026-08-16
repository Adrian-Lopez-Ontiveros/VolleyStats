"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BoxScoreReveal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="print-hidden w-full"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Ocultar box score" : "Ver box score"}
      </Button>
      {open ? children : null}
    </div>
  );
}
