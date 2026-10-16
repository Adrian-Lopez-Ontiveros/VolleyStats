"use client";

import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Cambiar contraseña dentro de Ajustes (misma lógica que la antigua /perfil/password). */
export function PasswordSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="mx-auto max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4 pr-8 text-left">
          <SheetTitle className="text-xl font-bold">Cambiar contraseña</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            La nueva contraseña se aplicará a tu sesión actual.
          </SheetDescription>
        </SheetHeader>
        {/* Se monta al abrir: formulario limpio cada vez */}
        {open ? <UpdatePasswordForm /> : null}
      </SheetContent>
    </Sheet>
  );
}
