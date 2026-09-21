import { NextResponse } from "next/server";
import { runScheduledFederationSync, type ScheduledFederationSyncKind } from "@/lib/federation/sync";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  if (request.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

function parseKind(request: Request): ScheduledFederationSyncKind {
  const kind = new URL(request.url).searchParams.get("kind");
  return kind === "results" ? "results" : "schedules";
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY para sincronizar FMV." },
      { status: 500 }
    );
  }

  try {
    const result = await runScheduledFederationSync(supabase, parseKind(request));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo sincronizar FMV." },
      { status: 500 }
    );
  }
}
