"use client";
import { FaShoppingCart } from "react-icons/fa";
import { useRef, useEffect, useState } from "react";
import { FaFacebookF, FaInstagram, FaEnvelope } from "react-icons/fa";
import { API_URL, WHATSAPP_NUMBER } from "@/lib/config";
import { money, optimizarImagen, mensajeDeError } from "@/lib/utils";

const LIMIT = 20; // productos por página

function ProductImg({ src, alt, width = 400, className }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={optimizarImagen(src, width) || "/placeholder.svg"}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "/placeholder.svg";
      }}
    />
  );
}

export default function DistribuidoraUI({ initialProductos = [], initialOfertas = [] }) {
  const [productos, setProductos] = useState(initialProductos);
  const [ofertas, setOfertas] = useState(initialOfertas);
  const [carrito, setCarrito] = useState([]);
  const [openCart, setOpenCart] = useState(false);

  // Búsqueda (con debounce: se consulta al servidor, no solo a lo ya cargado)
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");

  // Paginación
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialProductos.length === 0 || initialProductos.length >= LIMIT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reintento, setReintento] = useState(0);
  const vinoDelServidor = useRef(initialProductos.length > 0);

  const [nombreCliente, setNombreCliente] = useState("");
  const [direccionCliente, setDireccionCliente] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carruselRef = useRef(null);
  const carruselPausado = useRef(false);
  const sentinelRef = useRef(null);

  // ── Debounce de la búsqueda ──
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(busqueda.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  // ── Carga de productos: una sola vía para página 1, búsqueda y páginas siguientes ──
  useEffect(() => {
    if (!API_URL) {
      console.error("NEXT_PUBLIC_API_URL no está definido");
      return;
    }
    // La primera página ya llegó renderizada desde el servidor
    if (vinoDelServidor.current && page === 1 && q === "" && reintento === 0) {
      vinoDelServidor.current = false;
      return;
    }
    vinoDelServidor.current = false;

    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
        if (q) params.set("q", q);
        const res = await fetch(`${API_URL}/api/productos?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setHasMore(data.length === LIMIT);
        setProductos((prev) => {
          if (page === 1) return data;
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...data.filter((p) => !ids.has(p.id))];
        });
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error cargando productos:", err);
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [page, q, reintento]);

  // ── Ofertas del día: consulta propia (no dependen de las páginas cargadas) ──
  useEffect(() => {
    if (!API_URL) return;
    if (initialOfertas.length > 0 && reintento === 0) return;
    const controller = new AbortController();
    fetch(`${API_URL}/api/productos?ofertaDiaria=true&limit=20`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => Array.isArray(data) && setOfertas(data))
      .catch(() => {});
    return () => controller.abort();
  }, [initialOfertas.length, reintento]);

  // ── Scroll infinito: se pide la página siguiente cuando el final de la lista entra en pantalla ──
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setPage((p) => p + 1);
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, error, productos.length]);

  // ── Auto-scroll del carrusel (se pausa al tocarlo) ──
  useEffect(() => {
    const el = carruselRef.current;
    if (!el || ofertas.length < 2) return;
    let indice = 0;
    const id = setInterval(() => {
      if (carruselPausado.current) return;
      const primero = el.firstElementChild;
      if (!primero) return;
      indice = (indice + 1) % ofertas.length;
      el.scrollTo({ left: indice * (primero.offsetWidth + 24), behavior: "smooth" }); // 24 = gap-6
    }, 2000);
    return () => clearInterval(id);
  }, [ofertas]);

  // ── Carrito ──
  const agregarAlCarrito = (producto) => {
    const existente = carrito.find((p) => p.id === producto.id);
    if (existente && existente.cantidad >= producto.stock) {
      return alert(`⚠️ No hay más stock disponible de "${producto.nombre}"`);
    }
    if (!existente && producto.stock <= 0) return;
    setCarrito((prev) =>
      existente
        ? prev.map((p) => (p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p))
        : [...prev, { ...producto, cantidad: 1 }]
    );
  };

  const quitarDelCarrito = (id) => setCarrito((prev) => prev.filter((p) => p.id !== id));

  const sumarCantidad = (id) => {
    const item = carrito.find((p) => p.id === id);
    if (!item) return;
    if (item.cantidad >= item.stock) {
      return alert(`⚠️ No hay más stock disponible de "${item.nombre}"`);
    }
    setCarrito((prev) => prev.map((p) => (p.id === id ? { ...p, cantidad: p.cantidad + 1 } : p)));
  };

  const restarCantidad = (id) =>
    setCarrito((prev) =>
      prev.map((p) => (p.id === id ? { ...p, cantidad: Math.max(1, p.cantidad - 1) } : p))
    );

  const totalCarrito = carrito.reduce((total, item) => total + item.precio * item.cantidad, 0);
  const cantidadEnCarrito = carrito.reduce((total, item) => total + item.cantidad, 0);

  // ── Confirmar pedido: una sola llamada; el servidor valida stock, calcula el total y numera ──
  const comprar = async () => {
    if (enviando) return;
    if (carrito.length === 0) return alert("Tu carrito está vacío.");
    if (!nombreCliente.trim() || !direccionCliente.trim()) {
      return alert("Por favor ingresa tu nombre y dirección.");
    }

    setEnviando(true);
    // Se abre la pestaña ahora (dentro del click) para que Safari/iOS no bloquee el popup
    const ventana = window.open("", "_blank");

    try {
      const res = await fetch(`${API_URL}/api/compras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: nombreCliente.trim(),
          direccion: direccionCliente.trim(),
          items: carrito.map(({ id, cantidad }) => ({ id, cantidad })),
        }),
      });
      if (!res.ok) throw new Error(await mensajeDeError(res, "No se pudo registrar el pedido."));
      const pedido = await res.json();

      const numero = `PED-${String(pedido.numeroPedido).padStart(4, "0")}`;
      const items = Array.isArray(pedido.items) ? pedido.items : [];

      let mensaje = `🧾 *Nuevo pedido* #${numero}\n\n👤 Cliente: ${pedido.cliente}\n🏠 Dirección: ${pedido.direccion}\n\n📦 *Detalle del pedido:*\n`;
      items.forEach((item) => {
        mensaje += `- ${item.nombre}\n   ${item.cantidad} x $${money(item.precio)} = $${money(item.precio * item.cantidad)}\n`;
      });
      mensaje += `\n💰 *Total:* $${money(pedido.total).toFixed(2)}\n\n✅ Gracias por tu compra.`;

      const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(mensaje)}`;
      if (ventana) ventana.location.href = url;
      else window.location.href = url;

      // Reflejar el stock descontado sin volver a pedir todo
      const descontado = new Map(carrito.map((i) => [i.id, i.cantidad]));
      const ajustar = (lista) =>
        lista.map((p) => (descontado.has(p.id) ? { ...p, stock: Math.max(0, p.stock - descontado.get(p.id)) } : p));
      setProductos(ajustar);
      setOfertas(ajustar);

      setCarrito([]);
      setNombreCliente("");
      setDireccionCliente("");
      setOpenCart(false);
      alert("✅ Pedido realizado con éxito.");
    } catch (err) {
      if (ventana) ventana.close();
      console.error("Error en la compra:", err);
      alert(`❌ ${err.message || "Hubo un error al procesar tu compra."}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-700 to-stone-300 flex flex-col ">
      {/* NAVBAR */}
      <nav className="bg-gradient-to-r from-yellow-400 via-orange-300 to-red-400 shadow-lg fixed top-0 w-full z-50 h-44 flex items-center px-6 md:px-12">
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center ">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-nav.webp"
            alt="Logo"
            width={640}
            height={360}
            fetchPriority="high"
            className="w-64 sm:w-52 md:w-72 lg:w-80 h-auto mb-2 rounded-full shadow-lg hover:scale-110 transition-transform duration-300"
          />
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg">
            Distribuidora
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => setOpenCart(true)}
            aria-label="Abrir carrito"
            className="relative animate-pulse hover:scale-110 transition"
          >
            <FaShoppingCart className="text-3xl sm:text-5xl text-white" />
            {cantidadEnCarrito > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 rounded-full">
                {cantidadEnCarrito}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* 🏷️ Carrusel de ofertas diarias */}
      {ofertas.length > 0 && (
        <div className="relative w-full overflow-hidden py-6 mb-8 mt-52 bg-blue-500/30 backdrop-blur-md rounded-xl shadow-2xl border border-x-black/20">
          <h2 className="text-4xl text-white font-bold text-center mb-6 drop-shadow-lg">
            🔥 Ofertas del día 🔥
          </h2>
          <div
            ref={carruselRef}
            onMouseEnter={() => (carruselPausado.current = true)}
            onMouseLeave={() => (carruselPausado.current = false)}
            onTouchStart={() => (carruselPausado.current = true)}
            onTouchEnd={() => (carruselPausado.current = false)}
            className="flex gap-6 overflow-x-auto px-4 snap-x snap-mandatory scroll-smooth"
          >
            {ofertas.map((item) => {
              const enCarrito = carrito.find((p) => p.id === item.id);
              return (
                <div
                  key={item.id}
                  className="min-w-[250px] snap-center bg-white/80 backdrop-blur-sm rounded-xl p-4 flex flex-col items-center transform transition-transform duration-500 hover:scale-105 hover:shadow-2xl"
                >
                  <ProductImg
                    src={item.imagenUrl}
                    alt={item.nombre}
                    width={500}
                    className="w-full h-48 object-cover rounded-lg mb-3 shadow-md"
                  />
                  <h3 className="text-lg font-bold text-gray-700 text-center">{item.nombre}</h3>
                  <p className="text-green-600 font-semibold mb-2">${money(item.precio)}</p>

                  {enCarrito ? (
                    <button
                      onClick={() => quitarDelCarrito(item.id)}
                      className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition"
                    >
                      Quitar del carrito
                    </button>
                  ) : (
                    <button
                      onClick={() => agregarAlCarrito(item)}
                      disabled={item.stock === 0}
                      className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
                    >
                      {item.stock === 0 ? "Sin stock" : "Agregar al carrito"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PANEL DEL CARRITO */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 z-50 ${
          openCart ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 flex justify-between items-center border-b">
          <h2 className="text-lg font-semibold">🛒 Tu carrito</h2>
          <button onClick={() => setOpenCart(false)} aria-label="Cerrar carrito" className="text-2xl">
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-4rem)]">
          {carrito.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">Tu carrito está vacío 🛍️</p>
          ) : (
            <>
              {carrito.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b pb-2 mb-2">
                  <div>
                    <h3 className="font-medium">{item.nombre}</h3>
                    <p className="text-sm text-gray-500">
                      {item.cantidad} x ${money(item.precio)} ={" "}
                      <span className="font-semibold">${money(item.precio * item.cantidad)}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => restarCantidad(item.id)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 rounded"
                    >
                      ➖
                    </button>
                    <span className="w-6 text-center">{item.cantidad}</span>
                    <button
                      onClick={() => sumarCantidad(item.id)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 rounded"
                    >
                      ➕
                    </button>
                  </div>

                  <button
                    onClick={() => quitarDelCarrito(item.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-semibold"
                  >
                    Quitar
                  </button>
                </div>
              ))}

              <div className="mt-4 border-t pt-4 text-right">
                <p className="text-lg font-bold">Total: ${money(totalCarrito).toFixed(2)}</p>
              </div>

              <div className="mt-4 space-y-2">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  className="border p-2 w-full rounded"
                />
                <input
                  type="text"
                  placeholder="Dirección de entrega"
                  value={direccionCliente}
                  onChange={(e) => setDireccionCliente(e.target.value)}
                  className="border p-2 w-full rounded"
                />
              </div>

              <button
                onClick={comprar}
                disabled={enviando}
                className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition disabled:opacity-60"
              >
                {enviando ? "Enviando pedido..." : "✅ Confirmar pedido por WhatsApp"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Fondo oscuro al abrir carrito */}
      {openCart && (
        <div onClick={() => setOpenCart(false)} className="fixed inset-0 bg-black/40 z-40"></div>
      )}

      <main className={`container mx-auto p-4 pt-5 ${ofertas.length === 0 ? "mt-52" : ""}`}>
        {/* 🔍 Input de búsqueda */}
        <div className="max-w-md mx-auto my-6">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full p-3 text-2xl text-amber-50 font-bold rounded-lg border border-gray-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-600"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 ">
          {productos.map((producto) => (
            <div
              key={producto.id}
              className="bg-white rounded-xl shadow-lg p-2 flex flex-col items-center gap-1 group"
            >
              <ProductImg
                src={producto.imagenUrl}
                alt={producto.nombre}
                className="w-full h-48 object-cover rounded-lg mb-2 group-hover:scale-105 transition-transform duration-300"
              />
              <h2 className="text-lg font-bold text-gray-700 text-center">{producto.nombre}</h2>
              <p className="text-gray-500 text-center">
                Stock: <span className="font-semibold">{producto.stock}</span>
              </p>
              <p className="text-gray-500 text-center">
                Precio: <span className="font-semibold">${money(producto.precio)}</span>
              </p>
              <button
                onClick={() => agregarAlCarrito(producto)}
                className="w-2/3 hover:scale-105 transition bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:hover:scale-100"
                disabled={producto.stock === 0}
              >
                {producto.stock === 0 ? "Sin stock" : "Agregar al carrito"}
              </button>
            </div>
          ))}
        </div>

        {/* Estados de la lista */}
        <div className="text-center text-stone-100 py-8">
          {loading && <p>Cargando productos...</p>}
          {error && (
            <div>
              <p className="mb-2">No se pudieron cargar los productos.</p>
              <button
                onClick={() => {
                  setPage(1);
                  setReintento((n) => n + 1);
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Reintentar
              </button>
            </div>
          )}
          {!loading && !error && productos.length === 0 && (
            <p>{q ? `No encontramos productos para "${q}".` : "Todavía no hay productos."}</p>
          )}
        </div>

        {/* Al entrar en pantalla se carga la página siguiente */}
        {hasMore && !error && <div ref={sentinelRef} className="h-1" />}
      </main>

      {/* FOOTER */}
      <footer className="text-center text-gray-300 py-6 mt-12 bg-stone-900/70">
        Distribuidora &copy; {new Date().getFullYear()} | Todos los derechos reservados - DAMI-WEB
        <div className="justify-center flex gap-4 text-lg mt-2">
          <a href="mailto:contacto@distribuidora.com" aria-label="Email" className="hover:text-blue-600">
            <FaEnvelope />
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="hover:text-blue-600"
          >
            <FaFacebookF />
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="hover:text-blue-600"
          >
            <FaInstagram />
          </a>
        </div>
      </footer>
    </div>
  );
}
