"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { TEAM_CATEGORY_IDS } from "@/lib/categories";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const teamSchema = z.object({
  name: z.string().min(2, "El nombre del equipo es obligatorio"),
  shortName: z.string().max(8).optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  category: z.enum(TEAM_CATEGORY_IDS, {
    errorMap: () => ({ message: "Selecciona la categoría del equipo" }),
  }),
  isClub: z.enum(["true", "false"]).optional(),
});

function revalidateTeams(teamId?: string) {
  revalidatePath("/equipos");
  revalidatePath("/partidos");
  revalidatePath("/liga");
  if (teamId) {
    revalidatePath(`/equipos/${teamId}`);
    revalidatePath(`/equipos/${teamId}/editar`);
  }
}

export async function createTeam(formData: FormData) {
  await requireAdmin();
  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    shortName: formData.get("shortName") ?? "",
    city: formData.get("city") ?? "",
    category: formData.get("category"),
    isClub: formData.get("isClub") ?? "false",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const isClub = parsed.data.isClub === "true";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .insert({
      name: parsed.data.name.trim(),
      short_name: parsed.data.shortName?.trim() || null,
      city: parsed.data.city?.trim() || null,
      category: parsed.data.category,
      is_club_team: isClub,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("idx_teams_one_club_per_category")) {
      return { error: "Ya existe el equipo del club para esa categoría." };
    }
    return { error: error.message };
  }

  revalidateTeams(data.id);
  redirect(isClub ? `/equipos/${data.id}` : `/liga?categoria=${parsed.data.category}`);
}

export async function updateTeamLogo(teamId: string, logoUrl: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ logo_url: logoUrl })
    .eq("id", teamId);

  if (error) return { error: error.message };

  revalidateTeams(teamId);
  return { success: true };
}

export async function updateTeam(teamId: string, formData: FormData) {
  await requireAdmin();
  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    shortName: formData.get("shortName") ?? "",
    city: formData.get("city") ?? "",
    category: formData.get("category"),
    isClub: formData.get("isClub") ?? "false",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const isClub = parsed.data.isClub === "true";
  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({
      name: parsed.data.name.trim(),
      short_name: parsed.data.shortName?.trim() || null,
      city: parsed.data.city?.trim() || null,
      category: parsed.data.category,
      is_club_team: isClub,
    })
    .eq("id", teamId);

  if (error) {
    if (error.message.includes("idx_teams_one_club_per_category")) {
      return { error: "Ya existe el equipo del club para esa categoría." };
    }
    return { error: error.message };
  }

  revalidateTeams(teamId);
  redirect(`/equipos/${teamId}`);
}

export async function deleteTeam(teamId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

  if ((count ?? 0) > 0) {
    return {
      error: "No se puede eliminar un equipo que ya tiene partidos registrados.",
    };
  }

  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) return { error: error.message };

  revalidateTeams();
  redirect("/equipos");
}
