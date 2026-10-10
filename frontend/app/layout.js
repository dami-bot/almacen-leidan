import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  title: "almacen leidan",
  description: "Catálogo de productos, ofertas del día y pedidos online.",
};

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
