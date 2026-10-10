import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

// Solo se reenvían estas operaciones del panel (lista blanca).
const PERMITIDAS = [
  { metodos: ["GET"], ruta: /^compras$/ },
  { metodos: ["POST"], ruta: /^productos$/ },
  { metodos: ["POST"], ruta: /^productos\/actualizar-precios$/ },
  { metodos: ["PUT", "DELETE"], ruta: /^productos\/\d+$/ },
];

const json = (data, status) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

/**
 * Proxy del panel de administración: verifica la sesión en el servidor y recién
 * entonces llama al backend con la clave secreta (que nunca llega al navegador).
 */
async function handler(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return json({ message: "No autorizado" }, 401);

  const apiKey = process.env.ADMIN_API_KEY;
  if (!API_URL || !apiKey) {
    return json({ message: "Servidor sin configurar (API_URL / ADMIN_API_KEY)" }, 500);
  }

  const { path = [] } = await params;
  const ruta = path.join("/");
  const permitida = PERMITIDAS.some((r) => r.metodos.includes(req.method) && r.ruta.test(ruta));
  if (!permitida) return json({ message: "Operación no permitida" }, 403);

  const headers = { "x-api-key": apiKey };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  const conCuerpo = !["GET", "HEAD", "DELETE"].includes(req.method);

  try {
    const upstream = await fetch(`${API_URL}/api/${ruta}`, {
      method: req.method,
      headers,
      body: conCuerpo ? Buffer.from(await req.arrayBuffer()) : undefined,
      cache: "no-store",
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
    });
  } catch (err) {
    console.error("Error en proxy admin:", err);
    return json({ message: "No se pudo contactar al servidor" }, 502);
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
