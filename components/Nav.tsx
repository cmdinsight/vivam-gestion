"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Panel" },
  { href: "/clientes", label: "Clientes" },
  { href: "/cobros", label: "Cobros" },
  { href: "/trabajadores", label: "Cuidadores" },
  { href: "/profesionales", label: "Profesionales" },
  { href: "/guardia", label: "Guardia" },
  { href: "/procederes", label: "Procederes" },
  { href: "/configuracion", label: "Configuración" },
];

export default function Nav({ nombre }: { nombre: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-navy sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <span className="font-display text-champagne text-xl tracking-wide">Vivam</span>
        <div className="flex items-center gap-3 text-crema/90 text-sm">
          <Link href="/cambiar-password" className="hover:text-teal">
            {nombre}
          </Link>
          <button onClick={logout} className="hover:text-teal">
            Salir
          </button>
        </div>
      </div>
      <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto pb-2 -mt-1">
        {LINKS.map((l) => {
          const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                active ? "bg-teal text-white" : "text-crema/80 hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
