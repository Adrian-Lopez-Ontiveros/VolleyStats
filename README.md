# FuenlaStats

PWA de gestión de equipos de voleibol: plantillas, partidos, seguimiento en vivo y estadísticas automáticas.

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Realtime opcional)
- **Despliegue:** Vercel
- **Idioma de la UI:** español
- **Roles:** `player` (solo lectura + su foto), `coach` (lectura + pestaña Entrenador) y `admin` (gestión completa)

El primer usuario que se registre se convierte automáticamente en **administrador**.

---

## 1. Configurar las variables de entorno de Supabase

1. Crea un proyecto en [https://supabase.com](https://supabase.com).
2. En **Project Settings → API** copia:
   - **Project URL**
   - **anon public** key
3. En la raíz del repo:

```bash
copy .env.local.example .env.local
```

4. Edita `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Opcional, para el enlace de recuperación de contraseña en producción:

```env
NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app
```

5. En Supabase → **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000` (y luego tu dominio de Vercel)
   - **Redirect URLs:**
     - `http://localhost:3000/auth/callback`
     - `https://tu-dominio.vercel.app/auth/callback`

Si quieres entrar sin confirmar el email mientras pruebas, en **Authentication → Providers → Email** desactiva *Confirm email*.

---

## 2. Ejecutar las migraciones SQL

1. Abre el proyecto en Supabase → **SQL Editor → New query**.
2. Pega el contenido de `supabase/schema.sql` (o `supabase/migrations/001_init.sql`).
3. Pulsa **Run**.

Eso crea:

| Tabla | Uso |
|---|---|
| `profiles` | Usuarios autenticados + `role` (`player` \| `coach` \| `admin`) |
| `trainings` | Entrenamientos del cuerpo técnico |
| `training_files` | Vídeos y archivos de un entrenamiento |
| `tactical_plays` | Disposiciones guardadas de la pizarra |
| `jump_analyses` | Mediciones de salto vertical |
| `teams` | Equipos |
| `players` | Plantilla (puede existir sin cuenta) y estadísticas acumuladas |
| `player_cards` | Cromo tipo FIFA: foto, posición y 6 stats (1-99) |
| `matches` | Partidos, marcador y sets |
| `match_events` | Cada punto registrado |
| `news` | Tablón de noticias y anuncios del club |

También activa:

- Trigger `on_auth_user_created`: al registrarse se crea `profiles` + `players`. El primer usuario es admin.
- RLS en todas las tablas
- Bucket público `avatars` en Storage
- Bucket público `coach-media` para vídeos y archivos de entrenador
- Función `recompute_player_stats`

Si el proyecto ya estaba creado, ejecuta también:

- `supabase/migrations/014_coach_tools.sql` para el rol `coach` y las tablas de entrenador
- `supabase/migrations/015_player_cards.sql` para los cromos de jugador
- `supabase/migrations/016_player_card_framing.sql` para el reencuadre de foto y el nombre de la carta
- `supabase/migrations/017_tactical_play_training.sql` para vincular pizarras a entrenamientos
- `supabase/migrations/018_news.sql` para el tablón de noticias
- `supabase/migrations/019_news_cover_frame.sql` para reencuadrar la portada de las noticias

### Convertirte en admin a mano

Si ya te registraste como jugador:

```sql
update public.profiles
set role = 'admin'
where email = 'tu-email@dominio.com';
```

### Realtime (opcional)

En **Database → Publications → supabase_realtime** añade las tablas `matches` y `match_events` para que el marcador se actualice entre dispositivos.

---

## 3. Desarrollo local

Requisitos: Node.js 18+ y npm.

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

1. Crea una cuenta (ese usuario será admin).
2. Crea al menos dos equipos.
3. Añade jugadores a cada equipo.
4. Crea un partido y entra en **Seguimiento en vivo**.

---

## 4. Desplegar en Vercel

1. Sube el repositorio a GitHub / GitLab / Bitbucket.
2. En [Vercel](https://vercel.com) → **Add New Project** e importa el repo.
3. Framework: **Next.js** (se detecta solo).
4. Añade las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://tu-proyecto.vercel.app`
5. Deploy.
6. Vuelve a Supabase y añade las URLs de producción en **Redirect URLs**.

La app es instalable como PWA (manifiesto + service worker + iconos). En el móvil:

- **Android / Chrome:** menú → *Añadir a pantalla de inicio*
- **iOS / Safari:** compartir → *Añadir a pantalla de inicio*

Sin conexión se pueden consultar las pantallas ya visitadas. Registrar puntos requiere internet.

---

## Roles

**Jugador**

- Registro, login, logout, cambiar contraseña
- Ver su perfil y cambiar solo la foto
- Consultar equipos, jugadores, partidos y estadísticas (solo lectura)

**Admin**

- Todo lo anterior
- Crear / editar / eliminar equipos, jugadores y partidos
- Seguimiento en vivo (puntos, sets, deshacer)
- Asignar o quitar el rol de admin

Las rutas `/admin`, `/nuevo`, `/editar` y `/seguimiento` están protegidas en middleware y en servidor.

---

## Seguimiento de un partido

Al anotar un punto se indica:

- Quién lo hace (jugador local, visitante, o el equipo sin jugador)
- Tipo: Ataque, Bloqueo, Saque (ace), Error propio, Error del rival, Otro

Un **error propio** suma el punto al rival. El marcador (sets y puntos del set actual) se recalcula al momento y las estadísticas del jugador se actualizan solas.

Reglas usadas: al mejor de 5, sets a 25 (5.º a 15), ventaja de 2.

---

## Estructura

```
app/                 Rutas App Router
components/          UI, layout, formularios, tracker
lib/actions/         Server Actions
lib/supabase/        Clientes SSR / browser / middleware
supabase/schema.sql  SQL listo para pegar
public/sw.js         Service worker PWA
```
