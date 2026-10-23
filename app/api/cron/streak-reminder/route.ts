import { NextResponse } from "next/server";
import { sendStreakReminders } from "@/lib/streak-reminder";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  if (request.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

// Vercel cron «0 19 * * *» (UTC): 21:00 en Madrid en horario de verano, 20:00 en invierno.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const result = await sendStreakReminders();
  return NextResponse.json(result);
}
