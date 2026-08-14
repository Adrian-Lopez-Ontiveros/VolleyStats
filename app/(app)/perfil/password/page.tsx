import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default function PasswordPage() {
  return (
    <>
      <PageHeader
        title="Cambiar contraseña"
        description="La nueva contraseña se aplicará a tu sesión actual."
      />
      <UpdatePasswordForm />
    </>
  );
}
