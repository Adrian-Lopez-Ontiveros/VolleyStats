"use client";

import Link from "next/link";
import {
  CircleDot,
  ClipboardList,
  KeyRound,
  LogOut,
  Menu,
  Newspaper,
  Shield,
  Target,
  UserRound,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { SHOW_TACTICS_NAV } from "@/components/layout/nav-items";
import { hasCoachAccess } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/lib/types";

export function UserMenu({ user }: { user: SessionUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-11 w-11 rounded-full px-0" aria-label="Abrir menú">
          <Menu className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="truncate font-semibold">{user.profile.full_name}</div>
          <div className="truncate text-[11px] font-normal text-muted-foreground">
            {user.email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/noticias">
            <Newspaper className="h-4 w-4" />
            Noticias
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/equipos">
            <CircleDot className="h-4 w-4" />
            Equipos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/predicciones">
            <Target className="h-4 w-4" />
            Predicciones
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/perfil">
            <UserRound className="h-4 w-4" />
            Mi perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/perfil/password">
            <KeyRound className="h-4 w-4" />
            Cambiar contraseña
          </Link>
        </DropdownMenuItem>
        {SHOW_TACTICS_NAV && hasCoachAccess(user.profile.role) ? (
          <DropdownMenuItem asChild>
            <Link href="/entrenador">
              <ClipboardList className="h-4 w-4" />
              Táctica
            </Link>
          </DropdownMenuItem>
        ) : null}
        {user.profile.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield className="h-4 w-4" />
              Administración
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
