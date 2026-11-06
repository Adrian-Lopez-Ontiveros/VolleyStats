"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { SPECTATOR_COOKIE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import {
  closestPersonName,
  composeFullName,
  normalizePersonName,
  personNamesMatch,
} from "@/lib/utils";

type RosterRow = {
  id: string;
  full_name: string;
  user_id: string | null;
  team_id: string | null;
};

type StaffRow = {
  id: string;
  full_name: string;
  user_id: string | null;
  coached_team_id: string | null;
};

async function loadRosterForSignup(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ players: RosterRow[]; error?: string }> {
  const rpc = await supabase.rpc("list_roster_for_signup");
  if (!rpc.error) {
    return { players: (rpc.data ?? []) as RosterRow[] };
  }

  const table = await supabase
    .from("players")
    .select("id, full_name, user_id, team_id").eq("is_private", false);

  if (table.error) {
    return {
      players: [],
      error: `No se pudo leer la plantilla (${table.error.message}). Si un admin ya creó jugadores, falta dar permiso de lectura a anon (migración 004).`,
    };
  }

  return { players: (table.data ?? []) as RosterRow[] };
}

async function loadStaffForSignup(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ staff: StaffRow[]; error?: string }> {
  const rpc = await supabase.rpc("list_staff_for_signup");
  if (!rpc.error) {
    return { staff: (rpc.data ?? []) as StaffRow[] };
  }
  if (/list_staff_for_signup|staff_roster/i.test(rpc.error.message)) {
    return { staff: [] };
  }
  const table = await supabase
    .from("staff_roster")
    .select("id, full_name, user_id, coached_team_id");
  if (table.error) {
    if (/staff_roster/i.test(table.error.message)) return { staff: [] };
    return { staff: [], error: table.error.message };
  }
  return { staff: (table.data ?? []) as StaffRow[] };
}

const registerSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("Email no válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().min(1, "Introduce tu contraseña"),
});

export type ActionState = {
  error?: string;
  success?: string;
};

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const fullName = composeFullName(parsed.data.firstName, parsed.data.lastName);
  if (fullName.length < 3) {
    return { error: "Introduce tu nombre y apellido" };
  }

  const supabase = await createClient();

  let hasAdmin = true;
  const { data: adminFlag, error: adminError } = await supabase.rpc("has_admin");
  if (!adminError) {
    hasAdmin = Boolean(adminFlag);
  }

  let playerId: string | null = null;
  let teamId: string | null = null;
  let staffId: string | null = null;
  let coachedTeamId: string | null = null;

  if (hasAdmin) {
    const [{ players, error: rosterError }, { staff, error: staffError }] = await Promise.all([
      loadRosterForSignup(supabase),
      loadStaffForSignup(supabase),
    ]);
    if (rosterError) return { error: rosterError };
    if (staffError) return { error: staffError };

    const searched = normalizePersonName(fullName);
    const matches = players.filter((player) =>
      personNamesMatch(player.full_name, fullName)
    );
    const unlinked = matches.filter((player) => !player.user_id);

    if (unlinked.length === 1) {
      playerId = unlinked[0].id;
      teamId = unlinked[0].team_id;
    } else if (unlinked.length > 1) {
      return {
        error:
          "Hay más de un jugador con ese nombre y apellido. Contacta con un administrador para vincular tu cuenta.",
      };
    } else if (matches.length > 0) {
      return {
        error: "Ese jugador ya tiene una cuenta vinculada. Inicia sesión o recupera tu contraseña.",
      };
    } else {
      const staffMatches = staff.filter((row) => personNamesMatch(row.full_name, fullName));
      const staffOpen = staffMatches.filter((row) => !row.user_id);
      if (staffOpen.length === 1) {
        staffId = staffOpen[0].id;
        coachedTeamId = staffOpen[0].coached_team_id;
      } else if (staffOpen.length > 1) {
        return {
          error:
            "Hay más de un entrenador pendiente con ese nombre. Contacta con un administrador.",
        };
      } else if (staffMatches.length > 0) {
        return {
          error: "Ese entrenador ya tiene una cuenta vinculada. Inicia sesión o recupera tu contraseña.",
        };
      } else if (players.length === 0 && staff.length === 0) {
        return {
          error:
            `No se encontró ningún jugador ni entrenador al buscar «${fullName}» (0 resultados). Si un admin ya los creó, ejecuta la migración 004 / 053.`,
        };
      } else {
        const hint = closestPersonName(
          fullName,
          [...players.map((player) => player.full_name), ...staff.map((row) => row.full_name)]
        );
        return {
          error: hint
            ? `Ningún jugador ni entrenador coincide con «${fullName}» (${searched}). El más parecido es «${hint}».`
            : `Ningún jugador ni entrenador coincide con «${fullName}» (${searched}). Pide a un admin que te dé de alta en la plantilla o en el staff de entrenadores.`,
        };
      }
    }
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        player_id: playerId,
        team_id: teamId,
        staff_id: staffId,
        coached_team_id: coachedTeamId,
      },
    },
  });

  if (error) return { error: error.message };

  await supabase.rpc("link_profile_to_matching_player");

  revalidatePath("/", "layout");
  return {
    success:
      "Cuenta creada. Si tu proyecto exige confirmar el email, revisa tu bandeja de entrada.",
  };
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { error: "Email o contraseña incorrectos" };

  await supabase.rpc("link_profile_to_matching_player");

  const store = await cookies();
  store.delete(SPECTATOR_COOKIE);

  revalidatePath("/", "layout");
  // Todo el mundo entra por «Inicio» (/hoy).
  redirect("/hoy");
}

export async function enterAsSpectator() {
  const store = await cookies();
  store.set(SPECTATOR_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  revalidatePath("/", "layout");
  redirect("/hoy");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const store = await cookies();
  store.delete(SPECTATOR_COOKIE);
  revalidatePath("/", "layout");
  // Tras cerrar sesión se vuelve a «Inicio» como espectador (lo hace el middleware en «/»).
  redirect("/");
}

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const parsed = z.string().email("Email no válido").safeParse(email);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/actualizar-password`,
  });

  if (error) return { error: error.message };

  return {
    success: "Si el email existe, te hemos enviado un enlace para restablecer la contraseña.",
  };
}

export async function updatePasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres" };
  }
  if (password !== confirm) {
    return { error: "Las contraseñas no coinciden" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: "Contraseña actualizada correctamente" };
}
