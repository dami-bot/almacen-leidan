import DistribuidoraUI from "./distribuidoraUI";
import { API_URL } from "@/lib/config";

// La tienda es pública. La primera página de productos se trae en el servidor
// y se cachea 30 s, así el cliente no espera a hidratar para ver el catálogo.
export const revalidate = 30;

async function traer(ruta) {
  if (!API_URL) return [];
  try {
    const res = await fetch(`${API_URL}${ruta}`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return []; // si falla, el cliente lo intenta por su cuenta
  }
}

export default async function Page() {
  const [productos, ofertas] = await Promise.all([
    traer("/api/productos?page=1&limit=20"),
    traer("/api/productos?ofertaDiaria=true&limit=20"),
  ]);

  return <DistribuidoraUI initialProductos={productos} initialOfertas={ofertas} />;
}
