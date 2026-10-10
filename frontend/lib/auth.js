import CredentialsProvider from "next-auth/providers/credentials";
import { timingSafeEqual } from "crypto";

/** Comparación en tiempo constante (evita filtrar información por tiempos de respuesta). */
function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ""));
  const y = Buffer.from(String(b ?? ""));
  if (x.length !== y.length) {
    timingSafeEqual(x, x);
    return false;
  }
  return timingSafeEqual(x, y);
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        // Las credenciales viven en variables de entorno (Vercel), nunca en el código.
        const user = process.env.ADMIN_USERNAME;
        const pass = process.env.ADMIN_PASSWORD;
        if (!user || !pass || !credentials) return null; // sin configurar => nadie entra

        const userOk = safeEqual(credentials.username, user);
        const passOk = safeEqual(credentials.password, pass);
        return userOk && passOk ? { id: "admin", name: "Admin" } : null;
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8 horas
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
