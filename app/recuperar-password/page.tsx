import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPage() {
  return (
    <AuthShell
      title="Recuperar acceso"
      subtitle="Te enviaremos un enlace para crear una nueva contraseña."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
