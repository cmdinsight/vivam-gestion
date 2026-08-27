import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import SalirButton from "@/components/SalirButton";
import CambiarPasswordForm from "./CambiarPasswordForm";

export default async function CambiarPasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const volver = session.rol === "PROFESIONAL" ? "/portal" : "/dashboard";

  return (
    <div>
      <header className="bg-navy sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <span className="font-display text-champagne text-xl tracking-wide">Vivam</span>
          <div className="flex items-center gap-3 text-crema/90 text-sm">
            <span>{session.nombre}</span>
            <SalirButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Link href={volver} className="text-sm text-teal hover:underline">
          ← Volver
        </Link>
        <div className="max-w-sm">
          <h1 className="font-display text-2xl mb-4">Cambiar contraseña</h1>
          <CambiarPasswordForm />
        </div>
      </main>
    </div>
  );
}
