"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PlayerCardVisual } from "@/components/players/player-card";
import { SharePlayerCard } from "@/components/players/share-player-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertPlayerCard } from "@/lib/actions/player-cards";
import { POSITION_LABELS } from "@/lib/constants";
import {
  CARD_NAME_MODE_LABELS,
  CARD_STAT_KEYS,
  CARD_STAT_META,
  DEFAULT_CARD_STATS,
  DEFAULT_PHOTO_FRAME,
  calculateCardRating,
  cardPhotoUrl,
  clampCardStat,
  photoFrameFromCard,
  statValueTone,
  type CardPhotoFrame,
} from "@/lib/player-card";
import { resolveTeamLogoUrl } from "@/lib/federation/crests";
import { createClient } from "@/lib/supabase/client";
import type { CardNameMode, Player, PlayerCard, PlayerCardStats, PlayerPosition, Team } from "@/lib/types";

export function PlayerCardForm({
  player,
  card,
  team,
  userId,
  cancelHref,
}: {
  player: Pick<Player, "id" | "full_name" | "jersey_number" | "position" | "avatar_url">;
  card?: PlayerCard | null;
  team?: Pick<Team, "name" | "logo_url"> & { federation_team_id?: string | null } | null;
  userId: string;
  cancelHref: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(card?.photo_url ?? "");
  const [position, setPosition] = useState<PlayerPosition | "">(
    card?.position ?? player.position ?? ""
  );
  const [stats, setStats] = useState<PlayerCardStats>({
    jump: card?.jump ?? DEFAULT_CARD_STATS.jump,
    attack: card?.attack ?? DEFAULT_CARD_STATS.attack,
    block: card?.block ?? DEFAULT_CARD_STATS.block,
    serve: card?.serve ?? DEFAULT_CARD_STATS.serve,
    reception: card?.reception ?? DEFAULT_CARD_STATS.reception,
    defense: card?.defense ?? DEFAULT_CARD_STATS.defense,
  });
  const [lockRating, setLockRating] = useState(card?.rating_override != null);
  const [ratingOverride, setRatingOverride] = useState(
    card?.rating_override != null ? String(card.rating_override) : ""
  );
  const [photoFrame, setPhotoFrame] = useState<CardPhotoFrame>(photoFrameFromCard(card));
  const [nameMode, setNameMode] = useState<CardNameMode>(card?.name_mode ?? "last");
  const [displayName, setDisplayName] = useState(card?.display_name ?? "");

  const previewPhoto = cardPhotoUrl({ photo_url: photoUrl || null }, player.avatar_url);
  const previewPosition = (position || player.position) as PlayerPosition | null;
  const overrideValue = lockRating && ratingOverride ? Number(ratingOverride) : null;
  const liveRating = useMemo(
    () =>
      calculateCardRating(
        stats,
        previewPosition,
        overrideValue != null && Number.isFinite(overrideValue) ? overrideValue : null
      ),
    [stats, previewPosition, overrideValue]
  );

  function setStat(key: keyof PlayerCardStats, raw: string) {
    const value = clampCardStat(Number(raw));
    setStats((current) => ({ ...current, [key]: value }));
  }

  async function onUpload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("La imagen no puede superar 3 MB");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/card-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
      setPhotoFrame(DEFAULT_PHOTO_FRAME);
      toast.success("Foto de la carta lista. Arrástrala para reencuadrar y guarda.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la foto");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await upsertPlayerCard(player.id, formData);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Cromo guardado");
    router.push(cancelHref);
    router.refresh();
  }

  const fileSlug = `cromo-${player.full_name.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <PlayerCardVisual
          captureId="edit-player-card"
          className="mx-auto"
          onPhotoFrameChange={previewPhoto ? setPhotoFrame : undefined}
          data={{
            fullName: player.full_name,
            jerseyNumber: player.jersey_number,
            rosterPosition: player.position,
            cardPosition: position || null,
            photoUrl: previewPhoto,
            photoFrame,
            nameMode,
            displayName,
            teamName: team?.name,
            teamLogoUrl: team ? resolveTeamLogoUrl(team) : null,
            stats,
            ratingOverride:
              overrideValue != null && Number.isFinite(overrideValue) ? overrideValue : null,
          }}
        />
        {previewPhoto ? (
          <p className="text-center text-xs text-muted-foreground">
            Arrastra la foto para moverla dentro de la carta
          </p>
        ) : null}
        <SharePlayerCard
          captureId="edit-player-card"
          fileName={fileSlug}
          playerName={player.full_name}
        />
      </div>

      <form action={onSubmit} className="space-y-5">
        <input type="hidden" name="photoUrl" value={photoUrl} />
        <input type="hidden" name="photoFocusX" value={photoFrame.x} />
        <input type="hidden" name="photoFocusY" value={photoFrame.y} />
        <input type="hidden" name="photoZoom" value={photoFrame.zoom} />
        <input type="hidden" name="nameMode" value={nameMode} />
        <input type="hidden" name="displayName" value={displayName} />
        {CARD_STAT_KEYS.map((key) => (
          <input key={key} type="hidden" name={key} value={stats[key]} />
        ))}
        {lockRating ? <input type="hidden" name="ratingOverride" value={ratingOverride} /> : null}

        <div className="space-y-2">
          <Label>Foto de la carta</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {photoUrl ? "Cambiar foto" : "Subir foto"}
            </Button>
            {photoUrl ? (
              <Button type="button" variant="ghost" onClick={() => setPhotoUrl("")}>
                Usar foto de perfil
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Arrastra la foto sobre la carta para reencuadrarla. Máximo 3 MB.
          </p>
          {previewPhoto ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="photoZoom">Zoom</Label>
                <span className="text-sm font-semibold tabular-nums">
                  {Math.round(photoFrame.zoom * 100)}%
                </span>
              </div>
              <input
                id="photoZoom"
                type="range"
                min={1}
                max={2.5}
                step={0.05}
                value={photoFrame.zoom}
                onChange={(event) =>
                  setPhotoFrame((current) => ({
                    ...current,
                    zoom: Number(event.target.value),
                  }))
                }
                className="stat-slider w-full"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPhotoFrame(DEFAULT_PHOTO_FRAME)}
              >
                Centrar foto
              </Button>
            </div>
          ) : null}

          <div className="space-y-2 pt-2">
            <Label htmlFor="nameMode">Nombre en la carta</Label>
            <select
              id="nameMode"
              value={nameMode}
              onChange={(event) => setNameMode(event.target.value as CardNameMode)}
              className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
            >
              {Object.entries(CARD_NAME_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {nameMode === "custom" ? (
              <Input
                value={displayName}
                maxLength={40}
                placeholder="Ej. VANESA"
                onChange={(event) => setDisplayName(event.target.value)}
              />
            ) : null}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => onUpload(event.target.files?.[0])}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">Posición</Label>
          <select
            id="position"
            name="position"
            value={position}
            onChange={(event) => setPosition(event.target.value as PlayerPosition | "")}
            className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
          >
            <option value="">Sin definir</option>
            {Object.entries(POSITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Solo afecta al cromo, no a la plantilla. El rating se pondera según la posición
            (un líbero valora más recepción y defensa).
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold">Estadísticas</h2>
            <p className="text-sm text-muted-foreground">
              Rating {lockRating ? "fijado" : "calculado"}:{" "}
              <span className="font-bold text-foreground">{liveRating}</span>
            </p>
          </div>
          {CARD_STAT_KEYS.map((key) => (
            <StatSlider
              key={key}
              label={CARD_STAT_META[key].label}
              value={stats[key]}
              onChange={(value) => setStat(key, value)}
            />
          ))}
        </div>

        <label className="flex items-start gap-3 rounded-2xl border bg-card p-4 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-accent"
            checked={lockRating}
            onChange={(event) => {
              setLockRating(event.target.checked);
              if (event.target.checked && !ratingOverride) {
                setRatingOverride(String(liveRating));
              }
            }}
          />
          <span>
            <span className="font-medium">Fijar el rating a mano</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Si lo dejas desmarcado, se calcula solo a partir de las 6 stats.
            </span>
          </span>
        </label>

        {lockRating ? (
          <div className="space-y-2">
            <Label htmlFor="ratingOverrideVisible">Rating general</Label>
            <Input
              id="ratingOverrideVisible"
              type="number"
              min={1}
              max={99}
              value={ratingOverride}
              onChange={(event) => setRatingOverride(event.target.value)}
            />
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.push(cancelHref)}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="accent" className="flex-1" disabled={pending}>
            {pending ? "Guardando..." : card ? "Guardar cromo" : "Crear cromo"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function StatSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <Input
          type="number"
          min={1}
          max={99}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cnStat(value)}
        />
      </div>
      <input
        type="range"
        min={1}
        max={99}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="stat-slider w-full"
      />
    </div>
  );
}

function cnStat(value: number) {
  return `h-10 w-16 text-center font-bold ${statValueTone(value)}`;
}
