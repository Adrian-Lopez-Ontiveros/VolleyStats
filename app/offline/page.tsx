export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "#FEF3C7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          fontSize: 28,
        }}
      >
        ⚠
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".18em",
          textTransform: "uppercase",
          color: "#EA580C",
        }}
      >
        FuenlaStats
      </p>
      <h1 style={{ margin: "8px 0 0", fontSize: 28 }}>No hay internet</h1>
      <p style={{ margin: "12px 0 0", maxWidth: 340, fontSize: 14, lineHeight: 1.5, color: "#64748B" }}>
        El fallo no es de la app: este móvil no tiene conexión. Activa el Wi‑Fi o los datos
        móviles y vuelve a entrar.
      </p>
      <p
        id="offline-still"
        style={{
          display: "none",
          margin: "12px 0 0",
          fontSize: 14,
          fontWeight: 700,
          color: "#92400E",
        }}
      >
        Sigue sin internet. Comprueba el Wi‑Fi o los datos y prueba otra vez.
      </p>
      <button
        id="offline-retry"
        type="button"
        style={{
          marginTop: 28,
          border: 0,
          borderRadius: 12,
          background: "#EA580C",
          color: "#fff",
          fontWeight: 700,
          fontSize: 16,
          padding: "14px 22px",
          minWidth: 220,
        }}
      >
        Reintentar
      </button>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById("offline-retry").addEventListener("click", function () {
              var btn = document.getElementById("offline-retry");
              var still = document.getElementById("offline-still");
              btn.disabled = true;
              btn.textContent = "Comprobando...";
              still.style.display = "none";
              fetch("/api/health?t=" + Date.now(), { cache: "no-store" })
                .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
                .then(function (body) {
                  if (body && body.ok === true) location.replace("/");
                  else throw 0;
                })
                .catch(function () {
                  if (location.pathname !== "/offline.html") {
                    location.replace("/offline.html");
                    return;
                  }
                  btn.disabled = false;
                  btn.textContent = "Reintentar";
                  still.style.display = "block";
                });
            });
          `,
        }}
      />
    </main>
  );
}
