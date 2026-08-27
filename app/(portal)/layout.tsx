import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PortalNav from "@/components/PortalNav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  // Un admin no tiene nada que hacer acá; el portal es solo para profesionales y cuidadores.
  if (session.rol !== "PROFESIONAL" && session.rol !== "CUIDADOR") redirect("/dashboard");

  return (
    <div>
      <PortalNav nombre={session.nombre} rol={session.rol} />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
