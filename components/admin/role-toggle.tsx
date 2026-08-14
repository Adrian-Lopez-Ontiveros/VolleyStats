"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setUserRole } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/types";

export function RoleToggle({
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

  function toggle() {
    const next: UserRole = role === "admin" ? "player" : "admin";
    startTransition(async () => {
      const result = await setUserRole(userId, next);
      if (result.error) toast.error(result.error);
      else {
        toast.success(
          next === "admin" ? "Usuario promovido a admin" : "Rol de admin retirado"
        );
        router.refresh();
      }
    });
  }

  return (
    <Button
      size="sm"
      variant={role === "admin" ? "outline" : "accent"}
      disabled={disabled || pending}
      onClick={toggle}
    >
      {role === "admin" ? "Quitar admin" : "Hacer admin"}
    </Button>
  );
}
