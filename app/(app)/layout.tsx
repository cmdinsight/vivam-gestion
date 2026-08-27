import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Nav from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  // El middleware ya bloquea esto; doble chequeo por si algún path del panel
  // quedara afuera de su lista de rutas permitidas.
  if (session.rol === "PROFESIONAL" || session.rol === "CUIDADOR") redirect("/portal");

  return (
    <div>
      <Nav nombre={session.nombre} />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
