import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Shield, Smartphone, Trophy } from "lucide-react";
import { getSessionUser, isSpectatorGuest } from "@/lib/auth";
import { enterAsSpectator } from "@/lib/actions/auth";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export default async function HomePage() {
  const session = await getSessionUser();
  if (session) redirect("/noticias");
  if (await isSpectatorGuest()) redirect("/partidos");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-5 py-10">
      <div className="pt-6 text-center">
        <BrandMark className="mx-auto mb-5 h-28 w-28 md:h-32 md:w-32" />
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">
          Fuenlabrada
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">{APP_NAME}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Partidos, clasificación y estadísticas del club. Familias y afición
          entran sin cuenta.
        </p>
      </div>

      <ul className="mt-8 space-y-3 text-sm">
        <Feature icon={Trophy} text="Marcador y seguimiento de puntos en tiempo real" />
        <Feature icon={BarChart3} text="Estadísticas automáticas por jugador y partido" />
        <Feature icon={Shield} text="Familias entran como espectador, sin cuenta" />
        <Feature icon={Smartphone} text="PWA instalable, pensada para usar con el móvil" />
      </ul>

      <div className="mt-10 grid gap-3">
        <form action={enterAsSpectator}>
          <Button type="submit" size="lg" variant="accent" className="w-full">
            Entrar como espectador
          </Button>
        </form>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Ya tengo cuenta</Link>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          ¿Eres del club?{" "}
          <Link href="/registro" className="font-semibold text-accent hover:underline">
            Crear cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}

function Feature({
  icon: Icon,
  text,
}: {
  icon: typeof Trophy;
  text: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border bg-card px-4 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Icon className="h-4 w-4" />
      </span>
      <span>{text}</span>
    </li>
  );
}
