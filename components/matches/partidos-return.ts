const RETURN_KEY = "vs-partidos-return";
const SCROLL_KEY = "vs-partidos-scroll";
const HREF_KEY = "vs-partidos-href";
const RETURN_TTL_MS = 15000;

function storage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function markPartidosReturn() {
  storage()?.setItem(RETURN_KEY, String(Date.now()));
}

export function peekPartidosScroll() {
  const store = storage();
  if (!store) return null;
  const stamp = Number(store.getItem(RETURN_KEY));
  if (!Number.isFinite(stamp) || Date.now() - stamp > RETURN_TTL_MS) return null;
  const y = Number(store.getItem(SCROLL_KEY));
  return Number.isFinite(y) && y >= 0 ? y : 0;
}

export function clearPartidosReturn() {
  storage()?.removeItem(RETURN_KEY);
}

export function rememberPartidosScroll(y: number) {
  if (!Number.isFinite(y) || y < 0) return;
  storage()?.setItem(SCROLL_KEY, String(y));
}

export function rememberPartidosHref(href: string) {
  storage()?.setItem(HREF_KEY, href);
}

export function savedPartidosHref() {
  return storage()?.getItem(HREF_KEY) || null;
}
