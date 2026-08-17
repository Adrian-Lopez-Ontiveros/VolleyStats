import Link from "next/link";
import { Pencil } from "lucide-react";
import { PlayerCardVisual, type PlayerCardView } from "@/components/players/player-card";
import { SharePlayerCard } from "@/components/players/share-player-card";
import { Button } from "@/components/ui/button";
import { resolveTeamLogoUrl } from "@/lib/federation/crests";
import { cardPhotoUrl, photoFrameFromCard, statsFromCard } from "@/lib/player-card";
import type { Player, PlayerCard, Team } from "@/lib/types";

export function PlayerCardSection({
  player,
  card,
  team,
  canEdit,
  editHref,
  title = "Cromo",
}: {
  player: Pick<Player, "id" | "full_name" | "jersey_number" | "position" | "avatar_url">;
  card?: PlayerCard | null;
  team?: Pick<Team, "name" | "logo_url"> & { federation_team_id?: string | null } | null;
  canEdit?: boolean;
  editHref?: string;
  title?: string;
}) {
  const view: PlayerCardView = {
    fullName: player.full_name,
    jerseyNumber: player.jersey_number,
    rosterPosition: player.position,
    cardPosition: card?.position ?? null,
    photoUrl: cardPhotoUrl(card, player.avatar_url),
    photoFrame: photoFrameFromCard(card),
    nameMode: card?.name_mode ?? "last",
    displayName: card?.display_name ?? null,
    teamName: team?.name,
    teamLogoUrl: team ? resolveTeamLogoUrl(team) : null,
    stats: statsFromCard(card),
    ratingOverride: card?.rating_override ?? null,
  };
  const fileSlug = `cromo-${player.full_name.replace(/\s+/g, "-").toLowerCase()}`;
  const captureId = `player-card-${player.id}`;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {canEdit && editHref ? (
          <Button asChild size="sm" variant="outline">
            <Link href={editHref}>
              <Pencil className="h-4 w-4" />
              {card ? "Editar" : "Crear cromo"}
            </Link>
          </Button>
        ) : null}
      </div>
      <PlayerCardVisual captureId={captureId} className="mx-auto" data={view} />
      <SharePlayerCard
        captureId={captureId}
        fileName={fileSlug}
        playerName={player.full_name}
      />
      {!card && canEdit ? (
        <p className="text-center text-xs text-muted-foreground">
          Ajusta tus stats y la foto de la carta para completar el cromo.
        </p>
      ) : null}
    </section>
  );
}
