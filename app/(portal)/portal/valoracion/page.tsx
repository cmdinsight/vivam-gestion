"use client";

import { useEffect, useState } from "react";
import ValoracionForm from "@/components/ValoracionForm";

type Cliente = { id: string; nombrePaciente: string };

export default function ValoracionPortalPage() {
  const [rol, setRol] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [cargaError, setCargaError] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/portal/me").then((r) => r.json()), fetch("/api/portal/clientes").then((r) => r.json())])
      .then(([me, c]) => {
        if (!me?.rol) {
          setCargaError(true);
          return;
        }
        setRol(me.rol);
        setClientes(Array.isArray(c) ? c : []);
      })
      .catch(() => setCargaError(true));
  }, []);

  if (cargaError) return <p className="text-red-600">No se pudo cargar esta página. Probá recargar.</p>;
  if (!rol) return <p className="text-navy/60">Cargando…</p>;
  if (rol !== "MEDICO") {
    return <p className="text-navy/60">La valoración inicial la carga el médico evaluador.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">Valoración inicial del paciente</h1>
      <p className="text-sm text-navy/60">
        Completá esto en la primera visita a domicilio, antes de armar la cotización del plan. Queda guardado como la
        ficha médica del cliente: el resto del equipo la va a poder ver.
      </p>

      <div className="card p-4">
        <label className="label">Paciente</label>
        <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
          <option value="">Elegir…</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombrePaciente}
            </option>
          ))}
        </select>
      </div>

      {clienteId && (
        <ValoracionForm
          key={clienteId}
          clienteId={clienteId}
          cargarUrl={`/api/portal/valoracion?clienteId=${clienteId}`}
          guardarUrl="/api/portal/valoracion"
          guardarMetodo="POST"
        />
      )}
    </div>
  );
}
