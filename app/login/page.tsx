import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Bienvenido"
      subtitle="Entra con tu cuenta o como espectador para ver partidos, equipos y estadísticas."
    >
      <LoginForm />
    </AuthShell>
  );
}
