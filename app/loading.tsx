import { APP_NAME } from "@/lib/constants";

export default function RootLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0B1F3A]">
      <div className="flex h-24 w-24 items-center justify-center rounded-[22px] bg-white p-2.5 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" width={76} height={76} className="object-contain" />
      </div>
      <p className="mt-4 text-base font-extrabold tracking-wide text-white">{APP_NAME}</p>
      <div
        className="mt-5 h-[22px] w-[22px] rounded-full border-[2.5px] border-white/20 border-t-accent"
        style={{ animation: "app-splash-spin 0.7s linear infinite" }}
        aria-hidden
      />
    </div>
  );
}
