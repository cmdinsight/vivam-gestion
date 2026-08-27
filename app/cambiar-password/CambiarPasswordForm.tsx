"use client";

import { useState } from "react";

export default function CambiarPasswordForm() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actual, nueva }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setMsg({ text: "Contraseña actualizada.", ok: true });
      setActual("");
      setNueva("");
    } else {
      setMsg({ text: data.error || "Error al actualizar", ok: false });
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4">
      <div>
        <label className="label">Contraseña actual</label>
        <input className="input" type="password" value={actual} onChange={(e) => setActual(e.target.value)} />
      </div>
      <div>
        <label className="label">Nueva contraseña</label>
        <input className="input" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-teal" : "text-red-600"}`}>{msg.text}</p>}
      <button className="btn-primary w-full" disabled={loading}>
        {loading ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
