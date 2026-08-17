import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <WifiOff className="mb-4 h-10 w-10 text-accent" />
      <h1 className="text-2xl font-bold">Sin conexión</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Puedes consultar las pantallas que ya hayas visitado. Si estabas
        anotando un partido, las acciones se guardan en el dispositivo y se
        envían al volver la conexión.
      </p>
      <Button asChild className="mt-6">
        <Link href="/noticias">Reintentar</Link>
      </Button>
    </main>
  );
}
