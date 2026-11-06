const DB_MESSAGES: [RegExp, string][] = [
  [/row-level security policy/i, "La base de datos ha rechazado la operación por permisos de acceso."],
  [/permission denied/i, "La base de datos ha rechazado la operación por falta de permisos."],
  [/violates (.+?) constraint/i, "La base de datos no ha aceptado alguno de los datos."],
  [/Only a coach or administrator/i, "Solo un entrenador o administrador puede crear el equipo."],
  [/Team name must contain at least two characters/i, "El nombre del equipo debe tener al menos dos caracteres."],
  [/Only the owning coach/i, "No tienes permiso para crear este equipo en el espacio privado."],
];

export function visiblePrivateActionError(message: string, isAdmin = false): PrivateActionError {
  const friendly = DB_MESSAGES.find(([pattern]) => pattern.test(message))?.[1]
    ?? "No se pudo completar la operación. Vuelve a intentarlo en unos momentos.";
  const technical = isAdmin ? `Detalle de Supabase: ${message}`.slice(0, 1800) : undefined;
  return { error: friendly, errorDetail: technical };
}

export type PrivateActionError = { error: string; errorDetail?: string };
