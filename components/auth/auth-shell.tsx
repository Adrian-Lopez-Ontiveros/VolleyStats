import { BrandMark } from "@/components/brand-mark";
import { APP_NAME } from "@/lib/constants";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandMark className="mb-4 h-24 w-24 md:h-28 md:w-28" />
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          {APP_NAME}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
