"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, readTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const dark = theme === "dark";

  return (
    <button
      type="button"
      aria-pressed={dark}
      onClick={() => {
        const next = dark ? "light" : "dark";
        applyTheme(next);
        setTheme(next);
      }}
      aria-label={dark ? "Tema claro" : "Tema oscuro"}
      title={dark ? "Tema claro" : "Tema oscuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-card text-foreground"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
