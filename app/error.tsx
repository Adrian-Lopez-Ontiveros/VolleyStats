"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
  }, []);

  function retry() {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      window.location.replace("/");
      return;
    }
    reset();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      {offline ? (
        <>
          <WifiOff className="mb-4 h-10 w-10 text-amber-700" />
          <h1 className="text-2xl font-black">No hay internet</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            El fallo es la conexión, no la app. Activa el Wi‑Fi o los datos y reintenta.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-black">No se ha podido cargar</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Si no tienes internet, ese es el fallo. Si sí tienes conexión, prueba otra vez.
          </p>
        </>
      )}
      <Button type="button" className="mt-6" variant="accent" onClick={retry}>
        Reintentar
      </Button>
    </main>
  );
}
