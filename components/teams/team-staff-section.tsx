import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { TeamStaffMember } from "@/lib/team-staff";
import { initials } from "@/lib/utils";

export function TeamStaffSection({ staff }: { staff: TeamStaffMember[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Cuerpo técnico</h2>
      {staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este equipo todavía no tiene entrenadores asignados.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {staff.map((member) => (
            <Card key={member.key}>
              <CardContent className="flex items-center gap-3 p-4">
                <Avatar className="h-11 w-11">
                  <AvatarFallback>{initials(member.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{member.fullName}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary">Entrenador</Badge>
                    {member.playsHere ? <Badge variant="outline">También juega aquí</Badge> : null}
                    {member.playsInTeamName ? (
                      <Badge variant="outline">Juega en {member.playsInTeamName}</Badge>
                    ) : null}
                    {member.pending ? <Badge variant="outline">Pendiente de registro</Badge> : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
