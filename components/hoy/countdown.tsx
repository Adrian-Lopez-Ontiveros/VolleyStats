"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Cuenta atrás hasta el partido. Se pinta en cliente para no desajustar la hidratación. */
export function Countdown({ target, live }: { target: string; live?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (live) return <span className="font-bold">¡En juego!</span>;
  if (now == null) return <span className="tabular-nums opacity-0">00:00:00</span>;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return <span className="font-bold">¡Empieza ya!</span>;
  const { days, hours, minutes, seconds } = parts(diff);
  const units = [
    ...(days > 0 ? [[days, "d"] as const] : []),
    [hours, "h"] as const,
    [minutes, "min"] as const,
    [seconds, "s"] as const,
  ];
  return (
    <span className="inline-flex gap-1.5 tabular-nums" aria-label="Tiempo hasta el partido">
      {units.map(([value, unit]) => (
        <span key={unit} className="rounded-lg bg-black/10 px-1.5 py-0.5 font-black dark:bg-white/10">
          {String(value).padStart(2, "0")}
          <span className="ml-0.5 text-[10px] font-semibold opacity-70">{unit}</span>
        </span>
      ))}
    </span>
  );
}
