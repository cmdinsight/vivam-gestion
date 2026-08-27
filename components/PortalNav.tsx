"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SalirButton from "./SalirButton";

const LINKS = [
  { href: "/portal", label: "Inicio" },
  { href: "/portal/reportar", label: "Cargar" },
  { href: "/portal/historial", label: "Historial" },
];

export default function PortalNav({ nombre }: { nombre: string }) {
  const pathname = usePathname();

  return (
    <header className="bg-navy sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
        <span className="font-display text-champagne text-xl tracking-wide">Vivam · Portal</span>
        <div className="flex items-center gap-3 text-crema/90 text-sm">
          <Link href="/cambiar-password" className="hover:text-teal">
            {nombre}
          </Link>
          <SalirButton />
        </div>
      </div>
      <nav className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto pb-2 -mt-1">
        {LINKS.map((l) => {
          const active = pathname === l.href || (l.href !== "/portal" && pathname.startsWith(l.href));
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
