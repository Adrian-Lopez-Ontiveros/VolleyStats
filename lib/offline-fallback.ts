export const OFFLINE_FALLBACK_SCRIPT = `
(function () {
  if (window.__offlineFallback) return;
  window.__offlineFallback = true;
  var shown = false;

  function isOfflinePage() {
    return location.pathname === "/offline.html" || location.pathname === "/offline";
  }

  function stayOffline() {
    if (isOfflinePage()) {
      var btn = document.getElementById("offline-retry") || document.getElementById("retry");
      var still = document.getElementById("offline-still") || document.getElementById("still");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Reintentar";
      }
      if (still) still.style.display = "block";
      return;
    }
    location.replace("/offline.html");
  }

  function retry() {
    var btn = document.getElementById("offline-retry") || document.getElementById("retry");
    var still = document.getElementById("offline-still") || document.getElementById("still");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Comprobando...";
    }
    if (still) still.style.display = "none";
    var ctrl = typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined;
    fetch("/api/health?t=" + Date.now(), { cache: "no-store", signal: ctrl })
      .then(function (res) {
        return res.ok ? res.json() : Promise.reject();
      })
      .then(function (body) {
        if (body && body.ok === true) {
          location.replace("/");
          return;
        }
        throw new Error("offline");
      })
      .catch(function () {
        stayOffline();
      });
  }

  function show() {
    if (shown || isOfflinePage()) return;
    shown = true;
    document.documentElement.classList.add("app-ready");
    var splash = document.getElementById("app-splash");
    if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
    document.body.innerHTML =
      '<div id="offline-fallback" style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center;font-family:system-ui,sans-serif;background:#F8FAFC;color:#0B1F3A">' +
      '<div style="width:64px;height:64px;border-radius:16px;background:#FEF3C7;display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:28px">⚠</div>' +
      '<p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#EA580C">FuenlaStats</p>' +
      '<h1 style="margin:8px 0 0;font-size:28px">No hay internet</h1>' +
      '<p style="margin:12px 0 0;max-width:340px;font-size:14px;line-height:1.5;color:#64748B">El fallo no es de la app: este móvil no tiene conexión. Activa el Wi‑Fi o los datos móviles y vuelve a entrar.</p>' +
      '<p id="offline-still" style="display:none;margin:12px 0 0;font-size:14px;font-weight:700;color:#92400E">Sigue sin internet. Comprueba el Wi‑Fi o los datos y prueba otra vez.</p>' +
      '<button id="offline-retry" type="button" style="margin-top:28px;border:0;border-radius:12px;background:#EA580C;color:#fff;font-weight:700;font-size:16px;padding:14px 22px;min-width:220px">Reintentar</button>' +
      "</div>";
    var btn = document.getElementById("offline-retry");
    if (btn) btn.addEventListener("click", retry);
  }

  function looksLikeAppError() {
    var text = (document.body && document.body.innerText) || "";
    return /Application error|client-side exception|server-side exception/i.test(text);
  }

  function fatal(event) {
    if (looksLikeAppError() || !navigator.onLine) {
      show();
      return;
    }
    var msg = "";
    if (event) {
      if (event.message) msg += event.message;
      if (event.reason) msg += " " + (event.reason.message || event.reason);
    }
    if (
      /ChunkLoadError|Loading chunk|Failed to fetch|NetworkError|client-side exception|server-side exception|Application error/i.test(msg) ||
      (event && event.target && (event.target.tagName === "SCRIPT" || event.target.tagName === "LINK"))
    ) {
      show();
    }
  }

  window.addEventListener("error", fatal, true);
  window.addEventListener("unhandledrejection", fatal);
  window.addEventListener("offline", show);

  function watch() {
    if (!document.body) return;
    if (looksLikeAppError()) show();
    var obs = new MutationObserver(function () {
      if (looksLikeAppError()) show();
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    setInterval(function () {
      if (!shown && looksLikeAppError()) show();
    }, 250);
  }
  if (document.body) watch();
  else document.addEventListener("DOMContentLoaded", watch);

  if (!navigator.onLine && !/\\/seguimiento/.test(location.pathname)) {
    window.setTimeout(show, 200);
  }
})();
`;
