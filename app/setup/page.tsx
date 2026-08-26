"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserForm = { usuario: string; nombre: string; password: string };

export default function SetupPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [usuarios, setUsuarios] = useState<UserForm[]>([
    { usuario: "manuel", nombre: "Manuel", password: "" },
    { usuario: "camila", nombre: "Camila", password: "" },
  ]);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  function update(i: number, field: keyof UserForm, value: string) {
    setUsuarios((prev) => prev.map((u, idx) => (idx === i ? { ...u, [field]: value } : u)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, usuarios }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setMsg({ text: "Usuarios creados. Ya podés iniciar sesión.", ok: true });
      setTimeout(() => router.push("/login"), 1500);
    } else {
      setMsg({ text: data.error || "Error al crear usuarios", ok: false });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-lg p-8">
        <h1 className="font-display text-2xl text-navy mb-1">Configuración inicial de Vivam</h1>
        <p className="text-sm text-navy/60 mb-6">
          Este paso solo se puede hacer una vez, cuando todavía no hay ningún usuario creado. Elegí acá mismo el
          usuario y la contraseña de cada persona — nadie más los ve.
        </p>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="label">Clave de configuración (SETUP_SECRET)</label>
            <input className="input" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
          </div>
          {usuarios.map((u, i) => (
            <div key={i} className="border-t border-navy/10 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Usuario</label>
                <input className="input" value={u.usuario} onChange={(e) => update(i, "usuario", e.target.value)} />
              </div>
              <div>
                <label className="label">Nombre</label>
                <input className="input" value={u.nombre} onChange={(e) => update(i, "nombre", e.target.value)} />
              </div>
              <div>
                <label className="label">Contraseña</label>
                <input
                  className="input"
                  type="password"
                  value={u.password}
                  onChange={(e) => update(i, "password", e.target.value)}
                />
              </div>
            </div>
          ))}
          {msg && <p className={`text-sm ${msg.ok ? "text-teal" : "text-red-600"}`}>{msg.text}</p>}
          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? "Creando…" : "Crear usuarios"}
          </button>
        </form>
      </div>
    </div>
  );
}
