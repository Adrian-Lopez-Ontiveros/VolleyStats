import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import "./globals.css";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1F3A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

const splashBoot = `
window.__splashAt = Date.now();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preload" href="/logo.png" as="image" />
        <style>{`
          html:not(.app-ready),html:not(.app-ready) body{background:#0B1F3A}
          #app-splash{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse 80% 50% at 0% 0%,rgba(249,115,22,.28),transparent 55%),radial-gradient(ellipse 60% 45% at 100% 0%,rgba(56,189,248,.14),transparent 52%),#0B1F3A}
        `}</style>
      </head>
      <body className={`${font.className} min-h-dvh`}>
        <script dangerouslySetInnerHTML={{ __html: splashBoot }} />
        <div id="app-splash" role="status" aria-live="polite" aria-label="Cargando FuenlaStats">
          <div className="app-splash-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={76} height={76} />
          </div>
          <p className="app-splash-name">{APP_NAME}</p>
          <div className="app-splash-spin" aria-hidden />
        </div>
        <noscript>
          <style>{`#app-splash{display:none!important} html,body{background:hsl(210 40% 98%)}`}</style>
        </noscript>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
