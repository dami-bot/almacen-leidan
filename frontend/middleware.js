import { withAuth } from "next-auth/middleware";

// Solo la tienda ("/") es pública. El panel y el historial requieren sesión.
export default withAuth({ pages: { signIn: "/login" } });

export const config = { matcher: ["/admin/:path*", "/compras/:path*"] };
