import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vivam · Gestión interna",
  description: "Control interno de clientes, cobros, cuidadores y cargas sociales",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-crema min-h-screen">{children}</body>
    </html>
  );
}
