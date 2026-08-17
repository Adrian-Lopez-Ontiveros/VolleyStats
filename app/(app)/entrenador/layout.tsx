import { CoachNav } from "@/components/coach/coach-nav";
import { requireCoach } from "@/lib/auth";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCoach();
  return (
    <>
      <CoachNav />
      {children}
    </>
  );
}
