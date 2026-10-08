import {
  CircleDot,
  Medal,
  Target,
  Newspaper,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const spectatorItems: AppNavItem[] = [
  { href: "/noticias", label: "Noticias", icon: Newspaper },
  { href: "/partidos", label: "Partidos", icon: Trophy },
  { href: "/liga", label: "Liga", icon: Medal },
  { href: "/equipos", label: "Equipos", icon: CircleDot },
];

const memberItems: AppNavItem[] = [
  { href: "/partidos", label: "Partidos", icon: Trophy },
  { href: "/liga", label: "Liga", icon: Medal },
  { href: "/predicciones", label: "Predicciones", icon: Target },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

export const SHOW_TACTICS_NAV = false;

export function getAppNavItems({
  isGuest,
}: {
  isAdmin: boolean;
  isCoach?: boolean;
  isGuest: boolean;
}): AppNavItem[] {
  if (isGuest) return spectatorItems;
  return memberItems;
}
