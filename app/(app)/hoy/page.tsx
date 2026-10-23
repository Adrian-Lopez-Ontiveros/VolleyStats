import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HoyView } from "@/components/hoy/hoy-view";
import { getSessionUser } from "@/lib/auth";
import { loadHoyData } from "@/lib/hoy";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

export default async function HoyPage() {
  const user = await getSessionUser();
  // Los espectadores siguen entrando por Noticias.
  if (!user) redirect("/noticias");
  const supabase = await createClient();
  const data = await loadHoyData(user, supabase);
  return <HoyView data={data} />;
}
