"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setUserRole } from "@/lib/actions/admin";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["player", "coach", "admin"];

export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: UserRole;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(next: UserRole) {
    if (next === role) return;
    startTransition(async () => {
      const result = await setUserRole(userId, next);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`Rol actualizado a ${ROLE_LABELS[next].toLowerCase()}`);
        router.refresh();
      }
    });
  }

  return (
    <select
      value={role}
      disabled={disabled || pending}
      aria-label="Rol del usuario"
      onChange={(event) => onChange(event.target.value as UserRole)}
      className="h-9 max-w-[10.5rem] rounded-lg border border-input bg-card px-2 text-xs font-medium shadow-sm disabled:opacity-60"
    >
      {ROLES.map((item) => (
        <option key={item} value={item}>
          {ROLE_LABELS[item]}
        </option>
      ))}
    </select>
  );
}
