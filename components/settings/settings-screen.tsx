"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Info,
  KeyRound,
  LogOut,
  MessageSquare,
  Newspaper,
  Star,
  Trophy,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { ContactSheet } from "@/components/settings/contact-sheet";
import { PasswordSheet } from "@/components/settings/password-sheet";
import { AboutDialog } from "@/components/settings/about-dialog";
import { usePushSubscription } from "@/components/profile/use-push-subscription";
import { PwaInstallGuide, useInstallApp } from "@/components/pwa-install";
import { PageHeader } from "@/components/page-header";
import { Switch } from "@/components/ui/switch";
import { logoutAction } from "@/lib/actions/auth";
import { updateNotificationPref } from "@/lib/actions/notifications";
import {
  COLOR_THEMES,
  applyColorTheme,
  applyFontSize,
  readColorTheme,
  readFontSize,
  type ColorTheme,
  type FontSize,
} from "@/lib/theme";
import { cn, initials } from "@/lib/utils";

export type NotifyPrefs = {
  notify_league_results: boolean;
  notify_news: boolean;
  notify_match_reminder: boolean;
  notify_team_stats: boolean;
};

type ThemeMeta = {
  name: string;
  /** primario claro, acento claro, fondo claro, fondo oscuro, acento oscuro */
  swatches: [string, string, string, string, string];
};

const THEME_META: Record<ColorTheme, ThemeMeta> = {
  original: {
    name: "Original",
    swatches: ["hsl(214 68% 16%)", "hsl(24 95% 53%)", "hsl(210 40% 98%)", "hsl(214 48% 8%)", "hsl(24 95% 56%)"],
  },
  "c-hielo-acero": {
    name: "Hielo acero",
    swatches: ["hsl(210 28% 28%)", "hsl(191 85% 40%)", "hsl(210 30% 95%)", "hsl(214 24% 6%)", "hsl(189 90% 52%)"],
  },
  "a-cobalto-sol": {
    name: "Cobalto y sol",
    swatches: ["hsl(224 73% 37.6%)", "hsl(44 100% 55.1%)", "hsl(222 63% 96.9%)", "hsl(228 63% 7.5%)", "hsl(43 100% 62.0%)"],
  },
  "b-grafito-rojo": {
    name: "Grafito y rojo señal",
    swatches: ["hsl(225 8% 9.8%)", "hsl(352 84% 44.9%)", "hsl(240 5% 95.9%)", "hsl(240 5% 4.1%)", "hsl(353 77% 49.8%)"],
  },
  "a-pervinca-melocoton": {
    name: "Pervinca y melocotón",
    swatches: ["hsl(241 49% 34.9%)", "hsl(14 100% 70.6%)", "hsl(240 47% 97.1%)", "hsl(240 41% 8.0%)", "hsl(14 100% 74.5%)"],
  },
  "a-uva-limon": {
    name: "Uva y limón",
    swatches: ["hsl(264 61% 26.1%)", "hsl(55 82% 61.2%)", "hsl(260 43% 97.3%)", "hsl(260 35% 6.7%)", "hsl(55 88% 63.7%)"],
  },
};

const FONT_OPTIONS: { value: FontSize; label: string; className: string }[] = [
  { value: "sm", label: "Texto pequeño", className: "text-xs" },
  { value: "md", label: "Texto normal", className: "text-sm" },
  { value: "lg", label: "Texto grande", className: "text-lg" },
];

const PREF_ROWS: {
  key: keyof NotifyPrefs;
  title: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    key: "notify_league_results",
    title: "Resultados de mi liga",
    description: "Marcador final de los partidos de tu liga y tu equipo",
    icon: <Trophy className="h-4 w-4" />,
  },
  {
    key: "notify_news",
    title: "Nuevas noticias",
    description: "Cuando el club publica una noticia",
    icon: <Newspaper className="h-4 w-4" />,
  },
  {
    key: "notify_match_reminder",
    title: "Recordatorio del partido",
    description: "El día antes: rival, hora y pabellón",
    icon: <CalendarClock className="h-4 w-4" />,
  },
  {
    key: "notify_team_stats",
    title: "Estadísticas de mi equipo",
    description: "Te avisamos cuando se suban las estadísticas de un partido de tu equipo",
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

export function SettingsScreen({
  userId,
  name,
  email,
  avatarUrl,
  initialPrefs,
  hasSubscription,
  version,
}: {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  initialPrefs: NotifyPrefs;
  hasSubscription: boolean;
  version: string;
}) {
  const [colorTheme, setColorTheme] = useState<ColorTheme>("original");
  const [fontSize, setFontSize] = useState<FontSize>("md");
  const [prefs, setPrefs] = useState(initialPrefs);
  const [themesOpen, setThemesOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [installGuide, setInstallGuide] = useState(false);
  const push = usePushSubscription(hasSubscription);
  const install = useInstallApp();

  useEffect(() => {
    setColorTheme(readColorTheme());
    setFontSize(readFontSize());
    // Enlaces antiguos (/perfil/password) llegan como /ajustes?contrasena=1.
    const url = new URL(window.location.href);
    if (url.searchParams.get("contrasena") === "1") {
      setPasswordOpen(true);
      url.searchParams.delete("contrasena");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }, []);

  function chooseTheme(theme: ColorTheme) {
    applyColorTheme(theme);
    setColorTheme(theme);
  }

  function chooseFont(size: FontSize) {
    applyFontSize(size);
    setFontSize(size);
  }

  async function togglePref(key: keyof NotifyPrefs, value: boolean) {
    const previous = prefs[key];
    setPrefs((current) => ({ ...current, [key]: value }));
    try {
      const result = await updateNotificationPref(key, value);
      if ("error" in result && result.error) throw new Error(result.error);
    } catch (error) {
      setPrefs((current) => ({ ...current, [key]: previous }));
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el cambio.");
    }
  }

  async function onInstall() {
    const prompted = await install.promptInstall();
    if (!prompted) setInstallGuide(true);
  }

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="Ajustes" description="Tu cuenta, el aspecto de la app y los avisos." className="mb-4" />

      {/* Cabecera de usuario */}
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-base font-bold text-primary-foreground ring-2 ring-accent">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(name)
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{breakableEmail(email)}</p>
        </div>
        <Link
          href="/perfil"
          className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-accent"
        >
          Ir a mi perfil
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Apariencia */}
      <Section title="Apariencia">
        <div>
          <button
            type="button"
            aria-expanded={themesOpen}
            aria-controls="theme-picker"
            onClick={() => setThemesOpen((open) => !open)}
            className="flex w-full items-center gap-3 p-4 text-left hover:bg-secondary/60"
          >
            <div className="min-w-0 flex-1">
              <RowHead
                icon={<Star className="h-4 w-4" />}
                title="Tema de color"
                description="Se aplica en toda la app. Claro u oscuro, desde el botón de arriba."
              />
            </div>
            <span className="shrink-0 text-xs font-semibold text-accent">
              {THEME_META[colorTheme].name}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                themesOpen && "rotate-180"
              )}
            />
          </button>
          <div
            id="theme-picker"
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
              themesOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}
          >
            <div className="overflow-hidden" inert={!themesOpen}>
              <div className="grid grid-cols-2 gap-3 px-4 pb-4" role="radiogroup" aria-label="Tema de color">
                {COLOR_THEMES.map((theme) => (
                  <ThemeCard
                    key={theme}
                    theme={theme}
                    selected={colorTheme === theme}
                    onSelect={() => chooseTheme(theme)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t p-4">
          <RowHead
            icon={<Type className="h-4 w-4" />}
            title="Tamaño de texto"
            description="Más grande para leer el marcador desde la grada"
          />
          <div
            className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1"
            role="radiogroup"
            aria-label="Tamaño de texto"
          >
            {FONT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={fontSize === option.value}
                aria-label={option.label}
                onClick={() => chooseFont(option.value)}
                className={cn(
                  "h-9 rounded-lg font-semibold transition-colors",
                  option.className,
                  fontSize === option.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                A
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Notificaciones */}
      <Section title="Notificaciones">
        <SwitchRow
          icon={<Bell className="h-4 w-4" />}
          title="Activar notificaciones"
          description="Instala la app para recibirlas con el móvil bloqueado"
          checked={push.on}
          disabled={push.pending}
          onChange={(value) => void push.toggle(value)}
        />
        {PREF_ROWS.map((row) => (
          <SwitchRow
            key={row.key}
            icon={row.icon}
            title={row.title}
            description={row.description}
            checked={prefs[row.key]}
            disabled={!push.on}
            dimmed={!push.on}
            onChange={(value) => void togglePref(row.key, value)}
          />
        ))}
      </Section>

      {/* Cuenta */}
      <Section title="Cuenta">
        <ButtonRow icon={<KeyRound className="h-4 w-4" />} title="Cambiar contraseña" onClick={() => setPasswordOpen(true)} />
        <form action={logoutAction}>
          <ButtonRow type="submit" icon={<LogOut className="h-4 w-4" />} title="Cerrar sesión" />
        </form>
      </Section>

      {/* App */}
      <Section title="App">
        {install.installed ? (
          <StaticRow
            icon={<Download className="h-4 w-4" />}
            title="Instalar FuenlaStats"
            description="Ya instalada"
          />
        ) : (
          <ButtonRow
            icon={<Download className="h-4 w-4" />}
            title="Instalar FuenlaStats"
            description="Ábrela como una app, más rápida y con avisos"
            onClick={() => void onInstall()}
          />
        )}
      </Section>

      {/* Ayuda */}
      <Section title="Ayuda">
        <ButtonRow
          icon={<MessageSquare className="h-4 w-4" />}
          title="Contacto y sugerencias"
          description="Cuéntanos qué mejorar, qué falta o un error"
          onClick={() => setContactOpen(true)}
        />
        <ButtonRow
          icon={<Info className="h-4 w-4" />}
          title="Acerca de FuenlaStats"
          description={`Versión ${version} · CV Fuenlabrada`}
          onClick={() => setAboutOpen(true)}
        />
      </Section>

      <p className="pt-1 text-center text-xs text-muted-foreground">FuenlaStats · CV Fuenlabrada</p>

      <PasswordSheet open={passwordOpen} onOpenChange={setPasswordOpen} />
      <ContactSheet open={contactOpen} onOpenChange={setContactOpen} userId={userId} defaultEmail={email} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} version={version} />
      {installGuide ? (
        <PwaInstallGuide
          ios={install.ios}
          canPrompt={install.canPrompt}
          onInstall={() => void onInstall()}
          onClose={() => setInstallGuide(false)}
        />
      ) : null}
    </div>
  );
}

/** Permite partir el email solo antes de «@» y tras «.» o «-» (no a mitad de palabra). */
function breakableEmail(email: string) {
  return email.split(/(?=@)|(?<=[.-])/).map((part, index) => (
    <span key={index}>
      {index > 0 ? <wbr /> : null}
      {part}
    </span>
  ));
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h2>
      <div className="divide-y overflow-hidden rounded-2xl border bg-card shadow-card">{children}</div>
    </section>
  );
}

function IconTile({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
      {children}
    </span>
  );
}

function RowHead({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <IconTile>{icon}</IconTile>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}

const ROW_CLASS = "flex w-full items-center gap-3 px-4 py-3.5 text-left";

function ButtonRow({
  icon,
  title,
  description,
  onClick,
  type = "button",
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} onClick={onClick} className={cn(ROW_CLASS, "hover:bg-secondary/60")}>
      <div className="min-w-0 flex-1">
        <RowHead icon={icon} title={title} description={description} />
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function StaticRow({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className={ROW_CLASS}>
      <div className="min-w-0 flex-1">
        <RowHead icon={icon} title={title} description={description} />
      </div>
    </div>
  );
}

function SwitchRow({
  icon,
  title,
  description,
  checked,
  disabled,
  dimmed,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  dimmed?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className={cn(ROW_CLASS, dimmed && "opacity-50")}>
      <div className="min-w-0 flex-1">
        <RowHead icon={icon} title={title} description={description} />
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: ColorTheme;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = THEME_META[theme];
  const [primary, accent, bgLight, bgDark, accentDark] = meta.swatches;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "min-w-0 rounded-2xl border bg-card p-2.5 text-left transition-shadow",
        selected ? "border-accent ring-2 ring-accent/30" : "hover:border-muted-foreground/40"
      )}
    >
      {/* Mini vista previa: barra, tarjeta con punto y píldora, barra oscura */}
      <div className="space-y-1.5 rounded-xl border p-2" style={{ background: bgLight }} aria-hidden="true">
        <div className="h-2 w-3/5 rounded-full" style={{ background: primary }} />
        <div className="flex items-center justify-between rounded-lg border border-black/10 bg-white px-1.5 py-1">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
          <span className="h-2.5 w-7 rounded-full" style={{ background: primary }} />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
        </div>
        <div className="flex items-center justify-between rounded-lg px-1 py-1" style={{ background: bgDark }}>
          <span className="h-2.5 w-7 rounded-full" style={{ background: accentDark }} />
          <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="min-w-0 text-[13px] font-semibold leading-tight">{meta.name}</span>
        {selected ? (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 flex gap-1" aria-hidden="true">
        {meta.swatches.map((color, index) => (
          <span key={index} className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: color }} />
        ))}
      </div>
    </button>
  );
}
