import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    // «/» manda a los jugadores a Hoy y a los espectadores a Noticias.
    // id fijo con el start_url anterior para que la app instalada siga siendo la misma.
    id: "/noticias",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0B1F3A",
    theme_color: "#0B1F3A",
    lang: "es",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
