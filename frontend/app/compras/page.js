"use client";
import { useEffect, useState, useMemo } from "react";
import { signOut } from "next-auth/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { money } from "@/lib/utils";

// Cuántos grupos se muestran en el gráfico según el período (el resto sigue en los totales)
const MAX_BARRAS = { diario: 30, semanal: 12, mensual: 12, anual: 20 };

const corto = (d) => d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });

/** Devuelve cómo agrupar una fecha: `orden` (para ordenar cronológicamente) y `etiqueta` (para mostrar). */
function grupoDe(fecha, periodo) {
  const d = new Date(fecha);
  switch (periodo) {
    case "semanal": {
      const lunes = new Date(d);
      lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // semana que arranca el lunes
      lunes.setHours(0, 0, 0, 0);
      return { orden: lunes.getTime(), etiqueta: `Sem ${corto(lunes)}` };
    }
    case "mensual":
      return {
        orden: d.getFullYear() * 100 + d.getMonth(),
        etiqueta: d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
      };
    case "anual":
      return { orden: d.getFullYear(), etiqueta: String(d.getFullYear()) };
    default:
      return { orden: d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(), etiqueta: corto(d) };
  }
}

const itemsDe = (compra) => {
  if (Array.isArray(compra.items)) return compra.items;
  try {
    return JSON.parse(compra.items || "[]");
  } catch {
    return [];
  }
};

const totalDe = (compra) =>
  Number.isFinite(compra.total)
    ? compra.total
    : itemsDe(compra).reduce((acc, item) => acc + item.precio * item.cantidad, 0);

export default function HistorialCompras() {
  const [compras, setCompras] = useState([]);
  const [periodo, setPeriodo] = useState("diario");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarCompras = async () => {
      try {
        // Pasa por el proxy del servidor: contiene datos de clientes y requiere sesión
        const res = await fetch("/api/admin/compras");
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=/compras";
          return;
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || `Error ${res.status}`);
        }
        const data = await res.json();
        setCompras(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error al cargar compras:", err);
        setError(err.message || "No se pudo cargar el historial.");
        setCompras([]);
      } finally {
        setCargando(false);
      }
    };
    cargarCompras();
  }, []);

  // 🔹 Ventas agrupadas por período, en orden cronológico
  const ventasProcesadas = useMemo(() => {
    const grupos = new Map();
    for (const compra of compras) {
      const { orden, etiqueta } = grupoDe(compra.date, periodo);
      const actual = grupos.get(orden) ?? { fecha: etiqueta, total: 0 };
      actual.total += totalDe(compra);
      grupos.set(orden, actual);
    }
    return [...grupos.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, g]) => ({ fecha: g.fecha, total: money(g.total) }))
      .slice(-MAX_BARRAS[periodo]);
  }, [compras, periodo]);

  const totalGeneral = useMemo(() => compras.reduce((acc, c) => acc + totalDe(c), 0), [compras]);
  const cantidadCompras = compras.length;
  const promedioCompra = cantidadCompras ? totalGeneral / cantidadCompras : 0;

  // 🔹 PDF solo con texto (jsPDF se descarga recién al pedirlo)
  const generarPDF = async () => {
    const mod = await import("jspdf");
    const JsPDF = mod.jsPDF || mod.default;
    const doc = new JsPDF({ orientation: "portrait", unit: "px", format: "a4" });

    doc.setFontSize(20);
    doc.text("Reporte de Ventas", 40, 40);

    doc.setFontSize(14);
    doc.text(`Período: ${periodo.toUpperCase()}`, 40, 70);
    doc.text(`Total de ventas: $${money(totalGeneral).toFixed(2)}`, 40, 90);
    doc.text(`Cantidad de compras: ${cantidadCompras}`, 40, 110);
    doc.text(`Promedio por compra: $${money(promedioCompra).toFixed(2)}`, 40, 130);

    doc.setFontSize(16);
    doc.text("Ventas por período:", 40, 170);

    let y = 190;
    ventasProcesadas.forEach(({ fecha, total }) => {
      doc.text(`${fecha}: $${total.toFixed(2)}`, 60, y);
      y += 20;
      if (y > 750) {
        doc.addPage();
        y = 40;
      }
    });

    doc.save(`Reporte_Ventas_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800">📊 Historial de Ventas</h1>

        <div className="flex gap-2">
          <a href="/admin" className="bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm">
            ← Inventario
          </a>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="bg-stone-700 text-white px-3 py-2 rounded-lg text-sm"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
          >
            <option value="diario">Diario</option>
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
            <option value="anual">Anual</option>
          </select>

          <button
            onClick={generarPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Generar PDF
          </button>
        </div>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {cargando && <p className="text-gray-500">Cargando historial...</p>}

      {/* 🔹 Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/70 p-4 rounded-xl shadow-md text-center">
          <p className="text-gray-600 text-sm">Total Vendido</p>
          <h3 className="text-xl font-semibold">${money(totalGeneral).toFixed(2)}</h3>
        </div>
        <div className="bg-white/70 p-4 rounded-xl shadow-md text-center">
          <p className="text-gray-600 text-sm">Compras Totales</p>
          <h3 className="text-xl font-semibold">{cantidadCompras}</h3>
        </div>
        <div className="bg-white/70 p-4 rounded-xl shadow-md text-center">
          <p className="text-gray-600 text-sm">Promedio por Compra</p>
          <h3 className="text-xl font-semibold">${money(promedioCompra).toFixed(2)}</h3>
        </div>
      </div>

      {/* 🔹 Gráfico dinámico */}
      <div className="bg-white/70 rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          📅 Ventas {periodo.charAt(0).toUpperCase() + periodo.slice(1)}
          <span className="text-sm font-normal text-gray-500"> (últimos {MAX_BARRAS[periodo]} como máximo)</span>
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ventasProcesadas}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
            <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 🔹 Tabla de historial */}
      <div className="bg-white/70 rounded-xl shadow-md p-6 overflow-x-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">🧾 Detalle de Compras</h2>
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="bg-gray-200 text-gray-800 uppercase text-xs">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">N° Pedido</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {compras.map((c) => (
              <tr key={c.id} className="border-b border-gray-300 hover:bg-gray-50">
                <td className="px-4 py-2">{new Date(c.date).toLocaleDateString("es-AR")}</td>
                <td className="px-4 py-2">
                  {c.numeroPedido ? `PED-${String(c.numeroPedido).padStart(4, "0")}` : `#${c.id}`}
                </td>
                <td className="px-4 py-2">{c.cliente || "Cliente genérico"}</td>
                <td className="px-4 py-2">${money(totalDe(c)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!cargando && compras.length === 0 && !error && (
          <p className="mt-4 text-gray-500">Todavía no hay compras registradas.</p>
        )}
      </div>
    </div>
  );
}