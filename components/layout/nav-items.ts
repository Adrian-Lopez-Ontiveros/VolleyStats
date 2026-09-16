import {
  CircleDot,
  ClipboardList,
  Medal,
  Target,
  Newspaper,
  Shield,
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
  { href: "/noticias", label: "Noticias", icon: Newspaper },
  { href: "/partidos", label: "Partidos", icon: Trophy },
  { href: "/predicciones", label: "Predicciones", icon: Target },
  { href: "/liga", label: "Liga", icon: Medal },
  { href: "/equipos", label: "Equipos", icon: CircleDot },
];

export function getAppNavItems({
  isAdmin,
  isCoach,
  isGuest,
}: {
  isAdmin: boolean;
  isCoach?: boolean;
  isGuest: boolean;
}): AppNavItem[] {
  if (isGuest) return spectatorItems;

  return [
    ...memberItems,
    ...(isCoach ? [{ href: "/entrenador", label: "Táctica", icon: ClipboardList }] : []),
    { href: "/perfil", label: "Perfil", icon: UserRound },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];
}
