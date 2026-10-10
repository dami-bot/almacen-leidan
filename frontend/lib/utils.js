/** Redondea a 2 decimales (evita 0.30000000000000004 en pantalla). */
export const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Pide a Cloudinary una versión liviana de la imagen (formato y calidad automáticos + ancho máximo).
 * Si la URL no es de Cloudinary o ya trae transformaciones, la devuelve igual.
 */
export function optimizarImagen(url, width = 400) {
  if (!url) return null;
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  if (/\/upload\/[a-z]{1,3}_[^/]+\//.test(url)) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}

/** Las fechas de vencimiento se guardan como medianoche UTC: se muestran en UTC para no correrlas un día. */
export function fmtFecha(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

/** Valor para <input type="date"> (yyyy-mm-dd). */
export const aInputFecha = (valor) => (valor ? String(valor).slice(0, 10) : "");

/** Extrae un mensaje legible de una respuesta de error de Nest. */
export async function mensajeDeError(res, porDefecto = "Ocurrió un error") {
  try {
    const data = await res.json();
    const m = data?.message;
    if (Array.isArray(m)) return m.join(", ");
    if (typeof m === "string" && m) return m;
  } catch {}
  return porDefecto;
}
