import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="mt-2 text-2xl font-bold">Página no encontrada</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ese enlace no existe o ya no está disponible.
      </p>
      <Button asChild className="mt-6">
        <Link href="/noticias">Volver al inicio</Link>
      </Button>
    </main>
  );
}
