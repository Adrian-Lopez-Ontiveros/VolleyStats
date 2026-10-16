import { redirect } from "next/navigation";

// Ruta antigua: cambiar la contraseña vive ahora en Ajustes (hoja inferior).
export default function PasswordPage() {
  redirect("/ajustes?contrasena=1");
}
