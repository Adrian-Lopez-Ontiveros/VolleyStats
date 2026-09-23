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
      className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold shadow-sm"
    >
      {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      {dark ? "Tema claro" : "Tema oscuro"}
    </button>
  );
}
