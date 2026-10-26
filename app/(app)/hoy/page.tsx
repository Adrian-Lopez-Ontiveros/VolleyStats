import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HoyView } from "@/components/hoy/hoy-view";
import { getSessionUser, isSpectatorGuest } from "@/lib/auth";
import { loadHoyData, loadSpectatorHoyData } from "@/lib/hoy";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

export default async function HoyPage() {
  const user = await getSessionUser();
  const supabase = await createClient();
  if (!user) {
    // Espectadores: «Inicio» con lo público del club (sin datos de cuenta).
    if (!(await isSpectatorGuest())) redirect("/login");
    return <HoyView data={await loadSpectatorHoyData(supabase)} />;
  }
  const data = await loadHoyData(user, supabase);
  return <HoyView data={data} />;
}
