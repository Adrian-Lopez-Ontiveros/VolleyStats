"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Interruptor accesible (role="switch"), con el color de acento del tema. */
export const Switch = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
    checked: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }
>(({ checked, onCheckedChange, className, disabled, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange?.(!checked)}
    className={cn(
      "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      checked ? "bg-accent" : "bg-input",
      className
    )}
    {...props}
  >
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none block h-6 w-6 rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-5" : "translate-x-0"
      )}
    />
  </button>
));
Switch.displayName = "Switch";
