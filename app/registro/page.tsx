import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Registro" };

export default async function RegisterPage() {
  let isFirstAdmin = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("has_admin");
    isFirstAdmin = data === false;
  } catch {
    isFirstAdmin = false;
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle={
        isFirstAdmin
          ? "El primer usuario se convierte automáticamente en administrador."
          : "Regístrate solo si un administrador ya te ha dado de alta en la plantilla."
      }
    >
      <RegisterForm isFirstAdmin={isFirstAdmin} />
    </AuthShell>
  );
}
