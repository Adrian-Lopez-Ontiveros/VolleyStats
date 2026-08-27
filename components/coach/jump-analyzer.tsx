"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpFromLine, Loader2, Trash2, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { createJumpAnalysis, deleteJumpAnalysis } from "@/lib/actions/jumps";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import {
  COACH_MEDIA_BUCKET,
  MAX_TRAINING_VIDEO_BYTES,
} from "@/lib/constants";
import {
  estimateJumpFromVideo,
  formatJumpCm,
  jumpHeightFromFlight,
} from "@/lib/jump-analysis";
import { createClient } from "@/lib/supabase/client";
import { formatJersey, safeStorageName } from "@/lib/utils";
import type { JumpAnalysisWithRelations, Player, Training } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type RosterPlayer = Pick<Player, "id" | "full_name" | "jersey_number" | "team_id">;

export function JumpAnalyzer({
  players,
  trainings,
  jumps,
  canEdit = true,
}: {
  players: RosterPlayer[];
  trainings: Pick<Training, "id" | "name" | "scheduled_at" | "team_id">[];
  jumps: JumpAnalysisWithRelations[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [trainingId, setTrainingId] = useState("");
  const [height, setHeight] = useState("");
  const [source, setSource] = useState<"auto" | "manual">("manual");
  const [takeoff, setTakeoff] = useState<number | null>(null);
  const [landing, setLanding] = useState<number | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  const selectedPlayer = players.find((player) => player.id === playerId);
  const playerTrainings = useMemo(() => {
    if (!selectedPlayer?.team_id) return trainings;
    return trainings.filter(
      (training) => !training.team_id || training.team_id === selectedPlayer.team_id
    );
  }, [trainings, selectedPlayer]);

  function revokeUrl() {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
  }

  function applyEstimate(next: { heightCm: number; takeoffSec: number; landingSec: number }, origin: "auto" | "manual") {
    setHeight(String(next.heightCm));
    setTakeoff(next.takeoffSec);
    setLanding(next.landingSec);
    setSource(origin);
    if (videoRef.current) {
      videoRef.current.currentTime = next.takeoffSec;
    }
  }

  function onPickFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Selecciona un vídeo");
      return;
    }
    if (file.size > MAX_TRAINING_VIDEO_BYTES) {
      toast.error("El vídeo no puede superar 50 MB");
      return;
    }
    revokeUrl();
    const url = URL.createObjectURL(file);
    objectUrl.current = url;
    setVideoFile(file);
    setVideoSrc(url);
    setTakeoff(null);
    setLanding(null);
    setHeight("");
    setSource("manual");
    setMessage(null);
  }

  async function analyze() {
    const video = videoRef.current;
    if (!video || !videoSrc) {
      toast.error("Sube un vídeo corto del salto");
      return;
    }
    setAnalyzing(true);
    setProgress(0);
    setMessage(null);
    const result = await estimateJumpFromVideo(video, setProgress);
    setAnalyzing(false);
    if ("error" in result) {
      setMessage(result.error);
      toast.error(result.error);
      return;
    }
    applyEstimate(result, "auto");
    setMessage(
      `Detectado: despegue ${result.takeoffSec.toFixed(2)}s · aterrizaje ${result.landingSec.toFixed(2)}s`
    );
    toast.success(`Altura estimada: ${formatJumpCm(result.heightCm)}`);
  }

  function mark(kind: "takeoff" | "landing") {
    const video = videoRef.current;
    if (!video) return;
    const time = video.currentTime;
    const nextTakeoff = kind === "takeoff" ? time : takeoff;
    const nextLanding = kind === "landing" ? time : landing;
    if (kind === "takeoff") setTakeoff(time);
    else setLanding(time);

    if (nextTakeoff != null && nextLanding != null && nextLanding > nextTakeoff) {
      const cm = jumpHeightFromFlight(nextLanding - nextTakeoff);
      if (cm && cm >= 8 && cm <= 140) {
        setHeight((Math.round(cm * 10) / 10).toString());
        setSource("manual");
        setMessage(
          `Tiempo de vuelo ${(nextLanding - nextTakeoff).toFixed(2)}s → ${formatJumpCm(cm)}`
        );
      } else {
        setMessage("El intervalo marcado no parece un salto. Ajusta los tiempos.");
      }
    }
  }

  async function onSave() {
    const cm = Number(height.replace(",", "."));
    if (!playerId) {
      toast.error("Selecciona un jugador");
      return;
    }
    if (!Number.isFinite(cm) || cm <= 0) {
      toast.error("Introduce la altura en centímetros");
      return;
    }

    setSaving(true);
    try {
      let videoUrl = "";
      let videoPath = "";
      if (videoFile) {
        const supabase = createClient();
        const ext = videoFile.name.split(".").pop()?.toLowerCase() || "mp4";
        const path = `jumps/${playerId}/${Date.now()}-${safeStorageName(videoFile.name) || `salto.${ext}`}`;
        const { error } = await supabase.storage.from(COACH_MEDIA_BUCKET).upload(path, videoFile, {
          contentType: videoFile.type || "video/mp4",
          upsert: false,
        });
        if (error) throw error;
        videoPath = path;
        videoUrl = supabase.storage.from(COACH_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
      }

      const result = await createJumpAnalysis({
        playerId,
        trainingId,
        heightCm: Math.round(cm * 10) / 10,
        source,
        videoUrl,
        videoPath,
        takeoffSec: takeoff,
        landingSec: landing,
      });
      if (result.error) throw new Error(result.error);
      toast.success("Salto guardado");
      setHeight("");
      setTakeoff(null);
      setLanding(null);
      setVideoFile(null);
      setVideoSrc("");
      setMessage(null);
      revokeUrl();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el salto");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar este análisis de salto?")) return;
    setDeletingId(id);
    const result = await deleteJumpAnalysis(id);
    setDeletingId(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Análisis eliminado");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {canEdit ? (
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="jump-player">Jugador</Label>
            <select
              id="jump-player"
              value={playerId}
              onChange={(event) => setPlayerId(event.target.value)}
              className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
            >
              <option value="">Selecciona un jugador</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {formatJersey(player.jersey_number)} {player.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jump-training">Entrenamiento (opcional)</Label>
            <select
              id="jump-training"
              value={trainingId}
              onChange={(event) => setTrainingId(event.target.value)}
              className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
            >
              <option value="">Sin vincular</option>
              {playerTrainings.map((training) => (
                <option key={training.id} value={training.id}>
                  {training.name} ·{" "}
                  {format(new Date(training.scheduled_at), "d MMM", { locale: es })}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Vídeo del salto</Label>
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-xl bg-black"
              />
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-secondary/50 px-4 py-8 text-sm text-muted-foreground"
              >
                <Upload className="h-5 w-5" />
                Sube o graba un vídeo corto
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => onPickFile(event.target.files?.[0])}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
                <Video className="h-4 w-4" />
                {videoSrc ? "Cambiar vídeo" : "Elegir vídeo"}
              </Button>
              <Button type="button" variant="outline" disabled={!videoSrc || analyzing} onClick={analyze}>
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {analyzing ? `${Math.round(progress * 100)}%` : "Calcular auto"}
              </Button>
            </div>
            {videoSrc ? (
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => mark("takeoff")}>
                  Marcar despegue
                  {takeoff != null ? ` · ${takeoff.toFixed(2)}s` : ""}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => mark("landing")}>
                  Marcar aterrizaje
                  {landing != null ? ` · ${landing.toFixed(2)}s` : ""}
                </Button>
              </div>
            ) : null}
            {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
            <p className="text-xs text-muted-foreground">
              El cálculo automático usa el tiempo de vuelo y es aproximado. Si no encaja, marca
              despegue y aterrizaje o escribe la altura.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jump-height">Altura (cm)</Label>
            <Input
              id="jump-height"
              inputMode="decimal"
              value={height}
              onChange={(event) => {
                setHeight(event.target.value);
                setSource("manual");
              }}
              placeholder="42"
            />
            {source === "auto" ? (
              <p className="text-xs font-medium text-emerald-700">Calculado automáticamente. Puedes corregirlo.</p>
            ) : null}
          </div>

          <Button type="button" variant="accent" className="w-full" disabled={saving} onClick={onSave}>
            {saving ? "Guardando..." : "Guardar resultado"}
          </Button>
        </CardContent>
      </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Resultados guardados</h2>
        {jumps.length === 0 ? (
          <EmptyState
            icon={ArrowUpFromLine}
            title="Todavía no hay saltos"
            description="Guarda el primer análisis para ir creando el histórico de cada jugador."
          />
        ) : (
          <div className="space-y-3">
            {jumps.map((jump) => (
              <Card key={jump.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {jump.player
                          ? `${formatJersey(jump.player.jersey_number)} ${jump.player.full_name}`
                          : "Jugador"}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {format(new Date(jump.created_at), "d MMM yyyy · HH:mm", { locale: es })}
                        {jump.training ? ` · ${jump.training.name}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold tabular-nums">{formatJumpCm(Number(jump.height_cm))}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {jump.source === "auto" ? "Automático" : "Manual"}
                      </p>
                    </div>
                  </div>
                  {jump.video_url ? (
                    <video
                      src={jump.video_url}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full rounded-xl bg-black"
                    />
                  ) : null}
                  {canEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="w-full text-destructive"
                      disabled={deletingId === jump.id}
                      onClick={() => onDelete(jump.id)}
                    >
                      {deletingId === jump.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Eliminar
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
