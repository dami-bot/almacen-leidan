import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  title: "Almacén Leidan",
  description: "Almacén Leidan: catálogo de productos, ofertas del día y pedidos online por WhatsApp.",
  appleWebApp: { capable: true, title: "Almacén Leidan", statusBarStyle: "default" },
};

// Color de la barra del navegador en el celular
export const viewport = { themeColor: "#f97316" };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-50">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
