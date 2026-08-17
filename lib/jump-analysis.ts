/** Altura de salto por tiempo de vuelo: h = g · t² / 8 */
export const JUMP_G = 9.80665;
export const JUMP_HEIGHT_FACTOR_CM = (JUMP_G * 100) / 8;

export function jumpHeightFromFlight(flightSec: number) {
  if (!Number.isFinite(flightSec) || flightSec <= 0) return null;
  return JUMP_HEIGHT_FACTOR_CM * flightSec * flightSec;
}

export function formatJumpCm(cm: number) {
  return `${cm.toLocaleString("es-ES", {
    maximumFractionDigits: 1,
    minimumFractionDigits: cm % 1 === 0 ? 0 : 1,
  })} cm`;
}

export type JumpEstimate = {
  heightCm: number;
  takeoffSec: number;
  landingSec: number;
  flightSec: number;
};

function seekVideo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("No se pudo leer el vídeo"));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    const next = Math.min(Math.max(time, 0), Math.max(video.duration - 0.001, 0));
    if (Math.abs(video.currentTime - next) < 0.0005) {
      cleanup();
      resolve();
      return;
    }
    video.currentTime = next;
  });
}

function waitForData(video: HTMLVideoElement) {
  if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("No se pudo cargar el vídeo"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("error", onError);
  });
}

/**
 * Estima el salto midiendo el tiempo de vuelo.
 * Detecta la silueta en movimiento y busca el tramo más largo
 * en el que los pies se separan del suelo.
 */
export async function estimateJumpFromVideo(
  video: HTMLVideoElement,
  onProgress?: (progress: number) => void
): Promise<JumpEstimate | { error: string }> {
  try {
    await waitForData(video);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo cargar el vídeo" };
  }

  const duration = video.duration;
  if (!Number.isFinite(duration) || duration < 0.35) {
    return { error: "El vídeo es demasiado corto para medir el salto" };
  }

  const sampleFps = duration > 10 ? 20 : 30;
  const windowSec = Math.min(duration, 12);
  const startSec = duration > 12 ? Math.max((duration - 12) / 2, 0) : 0;
  const frameCount = Math.max(8, Math.round(windowSec * sampleFps));
  const step = windowSec / frameCount;

  const canvas = document.createElement("canvas");
  const width = 120;
  const height = Math.max(80, Math.round((video.videoHeight / Math.max(video.videoWidth, 1)) * width));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { error: "Este navegador no puede analizar el vídeo" };

  const previous = video.muted;
  video.muted = true;
  video.pause();

  const feet: number[] = [];
  const times: number[] = [];
  let background: Uint8ClampedArray | null = null;

  try {
    for (let i = 0; i < frameCount; i++) {
      const time = startSec + i * step;
      await seekVideo(video, time);
      ctx.drawImage(video, 0, 0, width, height);
      const { data } = ctx.getImageData(0, 0, width, height);

      if (!background) {
        background = new Uint8ClampedArray(data);
        feet.push(height - 1);
        times.push(time);
        onProgress?.((i + 1) / frameCount);
        continue;
      }

      let minY = height;
      let maxY = 0;
      let count = 0;
      for (let p = 0; p < data.length; p += 4) {
        const gray = (data[p] + data[p + 1] + data[p + 2]) / 3;
        const bg = (background[p] + background[p + 1] + background[p + 2]) / 3;
        if (Math.abs(gray - bg) < 28) continue;
        const pixel = p / 4;
        const y = Math.floor(pixel / width);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        count += 1;
      }

      feet.push(count > 18 ? maxY : height - 1);
      times.push(time);
      onProgress?.((i + 1) / frameCount);
    }
  } catch (err) {
    video.muted = previous;
    return { error: err instanceof Error ? err.message : "No se pudo analizar el vídeo" };
  }

  video.muted = previous;
  onProgress?.(1);

  const ground = percentile(
    feet.slice(0, Math.max(4, Math.floor(feet.length * 0.25))),
    0.8
  );
  const lift = Math.max(6, height * 0.045);
  const airborne = feet.map((y) => y < ground - lift);

  let bestStart = -1;
  let bestEnd = -1;
  let i = 0;
  while (i < airborne.length) {
    if (!airborne[i]) {
      i += 1;
      continue;
    }
    const start = i;
    while (i < airborne.length && airborne[i]) i += 1;
    const end = i - 1;
    if (bestStart < 0 || end - start > bestEnd - bestStart) {
      bestStart = start;
      bestEnd = end;
    }
  }

  if (bestStart < 0 || bestEnd <= bestStart) {
    return { error: "No se detectó un salto claro. Márcalo a mano o introduce la altura." };
  }

  const takeoffSec = times[bestStart];
  const landingSec = times[bestEnd];
  const flightSec = landingSec - takeoffSec;

  if (flightSec < 0.18 || flightSec > 1.35) {
    return { error: "El tiempo de vuelo no parece un salto vertical. Revísalo a mano." };
  }

  const heightCm = jumpHeightFromFlight(flightSec);
  if (heightCm == null || heightCm < 8 || heightCm > 140) {
    return { error: "La altura calculada no es realista. Introdúcela a mano." };
  }

  return {
    heightCm: Math.round(heightCm * 10) / 10,
    takeoffSec: Math.round(takeoffSec * 1000) / 1000,
    landingSec: Math.round(landingSec * 1000) / 1000,
    flightSec: Math.round(flightSec * 1000) / 1000,
  };
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[index];
}
