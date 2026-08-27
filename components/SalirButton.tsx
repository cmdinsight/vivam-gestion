"use client";

import { useRouter } from "next/navigation";

export default function SalirButton({ className }: { className?: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={logout} className={className ?? "hover:text-teal"}>
      Salir
    </button>
  );
}
