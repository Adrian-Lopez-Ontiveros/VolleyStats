# FuenlaStats

PWA de gestión de equipos de voleibol: plantillas, partidos, seguimiento en vivo, estadísticas, pizarra táctica y noticias.

**Demo:** [https://fuenlastats.vercel.app](https://fuenlastats.vercel.app)

## Stack

Next.js 15 · TypeScript · Tailwind · shadcn/ui · Supabase · Vercel

## Arranque local

1. Copia las variables de entorno:

```bash
cp .env.local.example .env.local

Rellena en .env.local:

envNEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

Ejecuta las migraciones SQL de supabase/ en el SQL Editor de Supabase.
Instala y arranca:

Bashnpm install
npm run dev
Abre http://localhost:3000.
Despliegue (Vercel)

Sube el repo a GitHub e impórtalo en Vercel.
Añade las mismas variables de entorno (NEXT_PUBLIC_SITE_URL = tu dominio de Vercel).
En Supabase, configura las Redirect URLs de producción.

Roles

Jugador: lectura + su perfil/cromo
Entrenador: lo anterior + pestaña Entrenador
Admin: gestión completa

El primer usuario registrado es admin.
