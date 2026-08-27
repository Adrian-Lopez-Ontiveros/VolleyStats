import { CoachNav } from "@/components/coach/coach-nav";
import { requireMember } from "@/lib/auth";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMember();
  return (
    <>
      <CoachNav />
      {children}
    </>
  );
}
