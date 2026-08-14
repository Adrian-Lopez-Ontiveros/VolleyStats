"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { registerAction, type ActionState } from "@/lib/actions/auth";
import { SpectatorEntry } from "@/components/auth/spectator-entry";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm({ isFirstAdmin = false }: { isFirstAdmin?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    registerAction,
    {}
  );

  return (
    <div className="space-y-4">
    <form action={action} className="space-y-4">
      {state.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success ? (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre</Label>
          <Input id="firstName" name="firstName" required placeholder="Ana" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellido</Label>
          <Input id="lastName" name="lastName" required placeholder="García" />
        </div>
      </div>
      {isFirstAdmin ? (
        <p className="text-xs text-muted-foreground">
          Serás el primer administrador. Después podrás dar de alta a la plantilla.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          El nombre y el apellido deben coincidir con un jugador que ya haya creado un
          administrador. Si no estás en la plantilla, entra como espectador.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
      <SpectatorEntry />
      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
