import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PortalNav from "@/components/PortalNav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  // Un admin no tiene nada que hacer acá; el portal es solo para profesionales.
  if (session.rol !== "PROFESIONAL") redirect("/dashboard");

  return (
    <div>
      <PortalNav nombre={session.nombre} />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
