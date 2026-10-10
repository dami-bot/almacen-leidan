"use client";
import { useRef, useEffect, useState } from "react";
import { FaShoppingCart, FaSearch, FaTimes, FaFacebookF, FaInstagram, FaEnvelope } from "react-icons/fa";
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
  const gridRef = useRef(null);

  // ── Debounce de la búsqueda ──
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(busqueda.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  // ── Al buscar, la vista baja hasta los resultados (la barra fija no los tapa) ──
  useEffect(() => {
    if (q) gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [q]);

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
      mensaje += `\n💰 *Total:* $${money(pedido.total).toFixed(2)}\n\n✅ GRACIAS BUENOS DIAS!!!.`;

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
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-700 to-stone-300 flex flex-col">
      {/* BARRA FIJA: marca + buscador + carrito (siempre visible al scrollear) */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 shadow-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:px-6">
          <span className="hidden shrink-0 text-xl font-black uppercase tracking-wider text-white drop-shadow sm:block">
            Almacén <span className="text-stone-900">Leidan</span>
          </span>

          <div className="relative flex-1">
            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              aria-label="Buscar productos"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-full border-2 border-white/70 bg-white py-2.5 pl-11 pr-10 text-base font-semibold text-stone-800 shadow-inner placeholder:font-normal placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-4 focus:ring-white/40"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                aria-label="Borrar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 hover:text-stone-800"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <button
            onClick={() => setOpenCart(true)}
            aria-label="Abrir carrito"
            className="relative shrink-0 rounded-full bg-white/20 p-3 text-white transition hover:scale-110 hover:bg-white/30"
          >
            <FaShoppingCart className="text-2xl" />
            {cantidadEnCarrito > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-900 px-1 text-xs font-bold text-white">
                {cantidadEnCarrito}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* HERO: título grande */}
      <section className="relative overflow-hidden px-4 pb-10 pt-12 text-center sm:pb-14 sm:pt-16">
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-yellow-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-red-500/30 blur-3xl" />

        <div className="relative">
          <p className="text-lg font-bold uppercase tracking-[0.5em] text-yellow-300 drop-shadow sm:text-2xl md:text-3xl">
            Almacén
          </p>
          <h1 className="bg-gradient-to-r from-yellow-200 via-orange-300 to-red-400 bg-clip-text text-7xl font-black uppercase leading-none tracking-tight text-transparent drop-shadow-2xl sm:text-9xl md:text-[10rem]">
            Leidan
          </h1>
          <div className="mx-auto mt-5 h-1.5 w-32 rounded-full bg-gradient-to-r from-yellow-300 to-red-500 sm:w-48" />
          <p className="mx-auto mt-5 max-w-xl text-base font-medium text-stone-200 sm:text-xl">
            Hacé tu pedido online y confirmalo por WhatsApp
          </p>
        </div>
      </section>

      {/* 🏷️ Carrusel de ofertas diarias (se oculta mientras se busca) */}
      {ofertas.length > 0 && !q && (
        <div className="relative mb-8 w-full overflow-hidden rounded-2xl border border-white/10 bg-blue-500/30 py-6 shadow-2xl backdrop-blur-md">
          <h2 className="mb-6 text-center text-3xl font-bold text-white drop-shadow-lg sm:text-4xl">
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
                  className="flex min-w-[250px] snap-center flex-col items-center rounded-2xl bg-white/90 p-4 backdrop-blur-sm transition-transform duration-500 hover:scale-105 hover:shadow-2xl"
                >
                  <ProductImg
                    src={item.imagenUrl}
                    alt={item.nombre}
                    width={500}
                    className="mb-3 h-48 w-full rounded-xl object-cover shadow-md"
                  />
                  <h3 className="text-center text-lg font-bold text-stone-700">{item.nombre}</h3>
                  <p className="mb-2 text-2xl font-black text-emerald-600">${money(item.precio)}</p>

                  {enCarrito ? (
                    <button
                      onClick={() => quitarDelCarrito(item.id)}
                      className="w-full rounded-xl bg-red-500 py-2 font-bold text-white transition hover:bg-red-600"
                    >
                      Quitar del carrito
                    </button>
                  ) : (
                    <button
                      onClick={() => agregarAlCarrito(item)}
                      disabled={item.stock === 0}
                      className="w-full rounded-xl bg-gradient-to-r from-orange-400 to-red-500 py-2 font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-50"
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

      <main className="container mx-auto p-4 pt-2">
        <div ref={gridRef} className="scroll-mt-24 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {productos.map((producto) => (
            <div
              key={producto.id}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="relative overflow-hidden">
                <ProductImg
                  src={producto.imagenUrl}
                  alt={producto.nombre}
                  className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-110 sm:h-48"
                />
                {producto.ofertaDiaria && (
                  <span className="absolute right-2 top-2 rounded-full bg-yellow-400 px-2 py-1 text-xs font-extrabold text-stone-900 shadow">
                    🔥 Oferta
                  </span>
                )}
                {producto.stock === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-stone-800/90 px-2 py-1 text-xs font-bold text-white">
                    Sin stock
                  </span>
                )}
                {producto.stock > 0 && producto.stock <= 3 && (
                  <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white shadow">
                    ¡Últimas {producto.stock}!
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1 p-3">
                <h2 className="line-clamp-2 min-h-[2.5rem] text-base font-bold leading-tight text-stone-800 sm:text-lg">
                  {producto.nombre}
                </h2>
                <p className="text-2xl font-black text-emerald-600">${money(producto.precio)}</p>
                <p className="text-xs text-stone-500">Stock: {producto.stock}</p>
                <button
                  onClick={() => agregarAlCarrito(producto)}
                  disabled={producto.stock === 0}
                  className="mt-auto w-full rounded-xl bg-gradient-to-r from-orange-400 to-red-500 py-2 font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  {producto.stock === 0 ? "Sin stock" : "Agregar al carrito"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Estados de la lista */}
        <div className="py-8 text-center text-stone-100">
          {loading && <p>Cargando productos...</p>}
          {error && (
            <div>
              <p className="mb-2">No se pudieron cargar los productos.</p>
              <button
                onClick={() => {
                  setPage(1);
                  setReintento((n) => n + 1);
                }}
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
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
      <footer className="mt-12 bg-stone-900/70 py-6 text-center text-gray-300">
        <p className="font-black uppercase tracking-widest text-yellow-300">Almacén Leidan</p>
        <p className="mt-1 text-sm">
          &copy; {new Date().getFullYear()} | Todos los derechos reservados - DAMI-WEB
        </p>
        <div className="mt-3 flex justify-center gap-4 text-lg">
          <a href="mailto:contacto@distribuidora.com" aria-label="Email" className="hover:text-yellow-300">
            <FaEnvelope />
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="hover:text-yellow-300"
          >
            <FaFacebookF />
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="hover:text-yellow-300"
          >
            <FaInstagram />
          </a>
        </div>
      </footer>
    </div>
  );
}