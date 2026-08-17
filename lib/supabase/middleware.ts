import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/registro",
  "/recuperar-password",
  "/actualizar-password",
  "/auth",
  "/offline",
];

const ADMIN_PREFIXES = [
  "/admin",
  "/equipos/nuevo",
  "/jugadores/nuevo",
  "/partidos/nuevo",
  "/noticias/nuevo",
  "/liga/rival",
];

const SPECTATOR_PREFIXES = ["/partidos", "/liga", "/equipos", "/jugadores", "/noticias"];
const SPECTATOR_COOKIE = "fuenla_spectator";

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isAdminPath(pathname: string) {
  if (pathname === "/entrenador" || pathname.startsWith("/entrenador/")) {
    return false;
  }
  if (ADMIN_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }
  if (pathname.includes("/editar")) return true;
  if (pathname.endsWith("/seguimiento") || pathname.includes("/seguimiento/")) {
    return true;
  }
  return false;
}

function isCoachPath(pathname: string) {
  return pathname === "/entrenador" || pathname.startsWith("/entrenador/");
}

function isSpectatorPath(pathname: string) {
  if (pathname.includes("/carta")) return false;
  return SPECTATOR_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[]
      ) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/offline"
  ) {
    return supabaseResponse;
  }

  const isGuest = request.cookies.get(SPECTATOR_COOKIE)?.value === "1";

  if (!user && !isPublicPath(pathname) && pathname !== "/") {
    if (isGuest && isSpectatorPath(pathname) && !isAdminPath(pathname)) {
      return supabaseResponse;
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/registro")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/noticias";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (isAdminPath(pathname) || isCoachPath(pathname))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role;
    const allowed = isAdminPath(pathname)
      ? role === "admin"
      : role === "admin" || role === "coach";

    if (!allowed) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/noticias";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
