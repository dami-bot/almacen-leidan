// Permite "Instalar app" / "Agregar a pantalla de inicio" con el ícono de Almacén Leidan.
export default function manifest() {
  return {
    name: "Almacén Leidan",
    short_name: "Leidan",
    description: "Catálogo, ofertas del día y pedidos online por WhatsApp.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1c1917",
    theme_color: "#f97316",
    lang: "es",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
