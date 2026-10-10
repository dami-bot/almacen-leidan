"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { API_URL, WHATSAPP_NUMBER } from "@/lib/config";
import { fmtFecha, aInputFecha, optimizarImagen, mensajeDeError } from "@/lib/utils";
import { signOut } from "next-auth/react";

const ADMIN = "/api/admin"; // proxy del servidor: verifica la sesión y agrega la clave del backend
const PAGINA_ADMIN = 200;
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const DIAS_AVISO = 7;

const estaPorVencer = (p) =>
  !!p.vencimiento && new Date(p.vencimiento).getTime() - Date.now() <= DIAS_AVISO * 24 * 60 * 60 * 1000;

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Alta
  const [nombre, setNombre] = useState("");
  const [stock, setStock] = useState("");
  const [precio, setPrecio] = useState("");
  const [file, setFile] = useState(null);
  const [vencimiento, setVencimiento] = useState("");
  const [ofertaDiaria, setOfertaDiaria] = useState(false);

  // Edición
  const [productoEditando, setProductoEditando] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editPrecio, setEditPrecio] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [editVencimiento, setEditVencimiento] = useState("");
  const [editOfertaDiaria, setEditOfertaDiaria] = useState(false);

  // Filtros / precios
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("");
  const [porcentaje, setPorcentaje] = useState("");

  // 📦 Cargar todos los productos (en bloques, para no pedir una respuesta gigante)
  const cargarProductos = useCallback(async () => {
    try {
      const todos = [];
      for (let page = 1; ; page++) {
        const res = await fetch(`${API_URL}/api/productos?page=${page}&limit=${PAGINA_ADMIN}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        todos.push(...data);
        if (data.length < PAGINA_ADMIN) break;
      }
      setProductos(todos);
    } catch (err) {
      console.error("❌ Error cargando productos:", err);
      alert("No se pudieron cargar los productos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  // Llamada al proxy del admin. Si la sesión venció, vuelve al login.
  const llamarAdmin = async (ruta, opciones = {}) => {
    const res = await fetch(`${ADMIN}/${ruta}`, opciones);
    if (res.status === 401) {
      window.location.href = "/login?callbackUrl=/admin";
      throw new Error("Sesión vencida");
    }
    if (!res.ok) throw new Error(await mensajeDeError(res, `Error ${res.status}`));
    return res;
  };

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase();
    return productos.filter((p) => {
      if (!p.nombre.toLowerCase().includes(texto)) return false;
      if (filtro === "porVencer") return estaPorVencer(p);
      if (filtro === "oferta") return p.ofertaDiaria;
      return true;
    });
  }, [productos, busqueda, filtro]);

  const avisarVencimiento = (producto) => {
    const mensaje = `⚠️ El producto "${producto.nombre}" está por vencer el ${fmtFecha(producto.vencimiento)}`;
    window.open(
      `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(mensaje)}`,
      "_blank"
    );
  };

  const actualizarPreciosFiltrados = async () => {
    if (productosFiltrados.length === 0) return alert("No hay productos que coincidan con el filtro");
    const pct = parseFloat(porcentaje);
    if (isNaN(pct)) return alert("Ingresa un porcentaje válido");
    if (!confirm(`¿Aplicar ${pct > 0 ? "+" : ""}${pct}% a ${productosFiltrados.length} productos?`)) return;

    setEnviando(true);
    try {
      await llamarAdmin("productos/actualizar-precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: productosFiltrados.map((p) => p.id), porcentaje: pct }),
      });
      alert(`✅ Precios actualizados en ${productosFiltrados.length} productos`);
      setPorcentaje("");
      await cargarProductos();
    } catch (err) {
      console.error(err);
      alert(`❌ Error al actualizar precios: ${err.message}`);
    } finally {
      setEnviando(false);
    }
  };

  // ☁️ Subida de imagen a Cloudinary (directo desde el navegador, preset sin firma)
  const subirImagen = async (archivo) => {
    if (!archivo) return "";
    const formData = new FormData();
    formData.append("file", archivo);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Error subiendo la imagen a Cloudinary");
    const data = await res.json();
    return data.secure_url;
  };

  // ➕ Agregar producto
  const agregarProducto = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const imagenUrl = file ? await subirImagen(file) : "";

      const formData = new FormData();
      formData.append("nombre", nombre);
      formData.append("stock", stock);
      formData.append("precio", precio);
      formData.append("vencimiento", vencimiento);
      formData.append("ofertaDiaria", ofertaDiaria ? "true" : "false");
      if (imagenUrl) formData.append("imagenUrl", imagenUrl);

      await llamarAdmin("productos", { method: "POST", body: formData });

      setNombre("");
      setStock("");
      setPrecio("");
      setFile(null);
      setVencimiento("");
      setOfertaDiaria(false);
      e.target.reset();
      await cargarProductos();
    } catch (err) {
      console.error("❌ Error al crear producto:", err);
      alert(`❌ ${err.message}`);
    } finally {
      setEnviando(false);
    }
  };

  // 🗑️ Eliminar producto
  const eliminarProducto = async (producto) => {
    if (!confirm(`¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await llamarAdmin(`productos/${producto.id}`, { method: "DELETE" });
      setProductos((prev) => prev.filter((p) => p.id !== producto.id));
    } catch (err) {
      console.error("❌ Error al eliminar producto:", err);
      alert(`❌ ${err.message}`);
    }
  };

  // ✏️ Abrir edición
  const abrirEdicion = (producto) => {
    setProductoEditando(producto);
    setEditNombre(producto.nombre);
    setEditStock(producto.stock);
    setEditPrecio(producto.precio);
    setEditFile(null);
    setEditVencimiento(aInputFecha(producto.vencimiento));
    setEditOfertaDiaria(!!producto.ofertaDiaria);
  };

  // 💾 Guardar edición
  const guardarEdicion = async (e) => {
    e.preventDefault();
    if (!productoEditando) return;

    setEnviando(true);
    try {
      const imagenUrl = editFile ? await subirImagen(editFile) : "";

      const formData = new FormData();
      formData.append("nombre", editNombre);
      formData.append("stock", Number(editStock));
      formData.append("precio", Number(editPrecio));
      formData.append("vencimiento", editVencimiento);
      formData.append("ofertaDiaria", editOfertaDiaria ? "true" : "false");
      if (imagenUrl) formData.append("imagenUrl", imagenUrl);

      await llamarAdmin(`productos/${productoEditando.id}`, { method: "PUT", body: formData });

      setProductoEditando(null);
      setEditFile(null);
      await cargarProductos();
    } catch (err) {
      console.error("❌ Error al actualizar producto:", err);
      alert(`❌ ${err.message}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 🔹 CABECERA FIJA CON FORMULARIO Y FILTROS */}
      <div className="sticky top-0 z-20 bg-gray-100 p-4 border-b shadow-sm">
        <div className="flex justify-end gap-2 mb-2">
          <a href="/compras" className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
            📊 Ver ventas
          </a>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="bg-stone-700 text-white px-3 py-1 rounded text-sm"
          >
            Cerrar sesión
          </button>
        </div>
        <div className="backdrop-blur-md bg-white/10 p-0 rounded-2xl shadow-lg mb-4 text-center">
          <h1 className="text-3xl font-bold">Inventario de Productos</h1>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-700 font-semibold">Total de productos: {productosFiltrados.length}</p>
          </div>
        </div>

        {/* Buscador */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 mb-4">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="p-2 border rounded w-full max-w-xs"
          />
        </div>

        {/* Formulario de carga */}
        <form onSubmit={agregarProducto} className="flex flex-wrap justify-center gap-2 mb-4">
          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="p-2 border rounded"
          />
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
            className="p-2 border rounded"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Precio"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            required
            className="p-2 border rounded"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0] ?? null)}
            className="p-2 border rounded"
          />
          <input
            type="date"
            value={vencimiento}
            onChange={(e) => setVencimiento(e.target.value)}
            title="Vencimiento (opcional)"
            className="p-2 border rounded"
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={ofertaDiaria} onChange={(e) => setOfertaDiaria(e.target.checked)} />
            Oferta del día
          </label>
          <button
            type="submit"
            disabled={enviando}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {enviando ? "Guardando..." : "Agregar"}
          </button>
        </form>

        {/* Filtros */}
        <div className="flex justify-center flex-wrap gap-2 mb-4">
          {[
            ["", "Todos"],
            ["porVencer", "Próximos a vencer"],
            ["oferta", "Ofertas del día"],
          ].map(([valor, etiqueta]) => (
            <button
              key={valor || "todos"}
              onClick={() => setFiltro(valor)}
              className={`px-3 py-1 rounded ${filtro === valor ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        {/* Porcentaje */}
        <div className="flex justify-center items-center gap-2 mb-2">
          <input
            type="number"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
            placeholder="Porcentaje (+/-)"
            className="border p-2 w-24"
          />
          <button
            onClick={actualizarPreciosFiltrados}
            disabled={enviando}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* 🔹 LISTA SCROLLEABLE */}
      <div className="flex-1 overflow-y-auto p-4">
        <ul className="grid grid-cols-2 sm:grid-cols-5 gap-6 w-full">
          {productosFiltrados.map((p) => (
            <li key={p.id} className="bg-white p-3 rounded flex flex-col relative shadow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={optimizarImagen(p.imagenUrl, 300) || "/placeholder.svg"}
                alt={p.nombre}
                loading="lazy"
                decoding="async"
                className="h-32 w-full object-cover mb-0 rounded"
              />
              <h3 className="font-bold">{p.nombre}</h3>
              <p>Stock: {p.stock}</p>
              <p>Precio: ${p.precio}</p>
              <p>Vence: {fmtFecha(p.vencimiento)}</p>
              {estaPorVencer(p) && (
                <button
                  onClick={() => avisarVencimiento(p)}
                  className="bg-red-600 text-white px-2 py-1 rounded mt-1"
                >
                  ⚠️ Avisar por WhatsApp
                </button>
              )}
              {p.ofertaDiaria && <p className="text-green-600 font-bold mt-1">🔥 En oferta del día</p>}
              <div className="mt-auto flex gap-2">
                <button onClick={() => abrirEdicion(p)} className="bg-yellow-500 text-white px-2 py-1 rounded">
                  Editar
                </button>
                <button onClick={() => eliminarProducto(p)} className="bg-red-500 text-white px-2 py-1 rounded">
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>

        {cargando && <p className="mt-4 text-gray-500">Cargando productos...</p>}
        {!cargando && productosFiltrados.length === 0 && (
          <p className="mt-4 text-gray-500">No hay productos para mostrar.</p>
        )}
      </div>

      {productoEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={guardarEdicion} className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Editar producto</h2>
            <input
              type="text"
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              placeholder="Nombre"
              className="border p-2 w-full mb-2"
              required
            />
            <input
              type="number"
              min="0"
              step="1"
              value={editStock}
              onChange={(e) => setEditStock(e.target.value)}
              placeholder="Stock"
              className="border p-2 w-full mb-2"
              required
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={editPrecio}
              onChange={(e) => setEditPrecio(e.target.value)}
              placeholder="Precio"
              className="border p-2 w-full mb-2"
              required
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setEditFile(e.target.files[0] ?? null)}
              className="border p-2 w-full mb-2"
            />
            <input
              type="date"
              value={editVencimiento}
              onChange={(e) => setEditVencimiento(e.target.value)}
              className="border p-2 w-full mb-2"
            />
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={editOfertaDiaria}
                onChange={(e) => setEditOfertaDiaria(e.target.checked)}
              />
              Oferta del día
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProductoEditando(null)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
              >
                {enviando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
