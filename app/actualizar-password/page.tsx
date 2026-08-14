import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function UpdatePasswordPage() {
  return (
    <AuthShell
      title="Nueva contraseña"
      subtitle="Elige una contraseña segura para tu cuenta."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
