"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    setEnviando(true);
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      username: form.username.value,
      password: form.password.value,
    });

    if (res?.ok && !res.error) {
      // Vuelve a la página que intentaba abrir (solo rutas internas)
      const destino = new URLSearchParams(window.location.search).get("callbackUrl");
      const ruta = destino && destino.startsWith("/") && !destino.startsWith("//") ? destino : "/admin";
      router.push(ruta);
      router.refresh();
    } else {
      setError("Usuario o contraseña incorrectos");
      setEnviando(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-blue-50 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Iniciar sesión</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input
          name="username"
          type="text"
          placeholder="Usuario"
          autoComplete="username"
          required
          className="border px-4 py-2 rounded w-full mb-4"
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          autoComplete="current-password"
          required
          className="border px-4 py-2 rounded w-full mb-4"
        />
        <button
          type="submit"
          disabled={enviando}
          className="bg-blue-600 text-white py-2 rounded w-full hover:bg-blue-700 transition disabled:opacity-60"
        >
          {enviando ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
    </main>
  );
}
