"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <main
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 24, margin: 0 }}>
            {offline ? "No hay internet" : "No se ha podido cargar"}
          </h1>
          <p style={{ marginTop: 12, maxWidth: 360, color: "#64748b", fontSize: 14 }}>
            {offline
              ? "El fallo es la conexión, no la app. Activa el Wi‑Fi o los datos y reintenta."
              : "Si no tienes internet, ese es el fallo. Si sí tienes conexión, prueba otra vez."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (!offline) {
                window.location.replace("/");
                return;
              }
              reset();
            }}
            style={{
              marginTop: 24,
              border: 0,
              borderRadius: 12,
              background: "#EA580C",
              color: "white",
              fontWeight: 700,
              padding: "12px 20px",
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
